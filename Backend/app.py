import os
import re
import uuid
import warnings
import asyncio
import base64

import requests as _http
import torch
import numpy as np
import torch.nn as nn
import whisper
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_talisman import Talisman
from pydub import AudioSegment
from pydub.utils import which
import librosa
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import Filter, FieldCondition, MatchValue, VectorParams, Distance, PointStruct  # noqa: F401
from transformers import Wav2Vec2Processor, Wav2Vec2ForSequenceClassification
from transformers.utils import logging as hf_logging
from nltk.tokenize import word_tokenize
from google import genai
from supabase import create_client, Client
from functools import wraps
from dotenv import load_dotenv
from datetime import datetime
from collections import Counter
import nltk

try:
    nltk.data.find("tokenizers/punkt")
except LookupError:
    nltk.download("punkt")
    nltk.download("punkt_tab")

EMOTION_SCORE_MAP = {
    "happy": 1,
    "calm": 1,
    "neutral": 0,
    "sad": -1,
    "angry": -1,
    "fear": -1,
    "disgust": -1,
}

load_dotenv()

NEGATIVE_EMOTIONS = ["sad", "angry", "fear", "disgust"]
POSITIVE_EMOTIONS = ["happy", "calm"]
NEUTRAL_EMOTIONS = ["neutral"]

# --------------------------------------------------
# TTS VOICE CONFIG (edge-tts voice mapping)
# --------------------------------------------------
# Maps detected emotion to an edge-tts voice name.
# Full voice list: https://github.com/rany2/edge-tts
TTS_VOICE_MAP = {
    "sadness":    "en-US-JennyNeural",
    "angry":      "en-US-GuyNeural",
    "fear":       "en-US-AriaNeural",
    "happiness":  "en-US-SaraNeural",
    "neutral":    "en-US-ChristopherNeural",
    "confidence": "en-US-TonyNeural",
    "disgust":    "en-US-GuyNeural",
    "happy":      "en-US-SaraNeural",
    "sad":        "en-US-JennyNeural",
    "calm":       "en-US-AriaNeural",
}
TTS_DEFAULT_VOICE = "en-US-ChristopherNeural"

gemini_client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
GEMINI_MODELS = ["gemini-3.5-flash-lite", "gemini-flash-latest", "gemini-3.7-flash"]

def generate_gemini_content(prompt):
    for m in GEMINI_MODELS:
        try:
            resp = gemini_client.models.generate_content(model=m, contents=prompt)
            if resp and resp.text:
                return resp.text
        except Exception as err:
            print(f"Gemini {m} error: {err}")
            continue
    raise RuntimeError("All Gemini candidate models failed to generate content")

# --------------------------------------------------
# ENV SETUP
# --------------------------------------------------

warnings.filterwarnings("ignore")
os.environ["TF_CPP_MIN_LOG_LEVEL"] = "3"
os.environ["TF_ENABLE_ONEDNN_OPTS"] = "0"
hf_logging.set_verbosity_error()

torch.manual_seed(42)
if torch.cuda.is_available():
    torch.cuda.manual_seed_all(42)

AudioSegment.converter = which("ffmpeg")

# --------------------------------------------------
# PATHS
# --------------------------------------------------

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, "uploads")
VOICE_MODEL_PATH = os.path.join(BASE_DIR, "emotion_model.pth")
TEXT_MODEL_PATH = os.path.join(BASE_DIR, "lstm_text_emotion.pth")

# Automatically fetch weights from Hugging Face model repo if not present locally (e.g. Render / Cloud)
try:
    from huggingface_hub import hf_hub_download
    HF_MODEL_REPO = os.getenv("HF_MODEL_REPO", "Pavan172874/emogita-models")
    if not os.path.exists(TEXT_MODEL_PATH):
        print(f"Downloading text emotion model from Hugging Face ({HF_MODEL_REPO})...")
        TEXT_MODEL_PATH = hf_hub_download(repo_id=HF_MODEL_REPO, filename="lstm_text_emotion.pth")
        print("Text emotion model downloaded successfully.")
    if not os.path.exists(VOICE_MODEL_PATH):
        print(f"Downloading voice emotion model from Hugging Face ({HF_MODEL_REPO})...")
        VOICE_MODEL_PATH = hf_hub_download(repo_id=HF_MODEL_REPO, filename="emotion_model.pth")
        print("Voice emotion model downloaded successfully.")
except Exception as e:
    print(f"Note: Error downloading model weights from Hugging Face: {e}")

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# --------------------------------------------------
# DEVICE
# --------------------------------------------------

device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

# --------------------------------------------------
# TEXT MODEL DEFINITION
# --------------------------------------------------


class BiLSTMEmotion(nn.Module):
    def __init__(self, vocab_size, embed_dim, hidden_dim, output_dim):
        super().__init__()
        self.embedding = nn.Embedding(vocab_size, embed_dim, padding_idx=0)
        self.lstm = nn.LSTM(embed_dim, hidden_dim, batch_first=True, bidirectional=True)
        self.fc = nn.Linear(hidden_dim * 2, output_dim)

    def forward(self, x):
        embedded = self.embedding(x)
        _, (hidden, _) = self.lstm(embedded)
        hidden = torch.cat((hidden[-2], hidden[-1]), dim=1)
        return self.fc(hidden)


# --------------------------------------------------
# LOAD TEXT EMOTION MODEL
# --------------------------------------------------

text_checkpoint = torch.load(TEXT_MODEL_PATH, map_location=device)
text_vocab = text_checkpoint["vocab"]

text_model = BiLSTMEmotion(
    vocab_size=len(text_vocab), embed_dim=128, hidden_dim=128, output_dim=7
).to(device)

text_model.load_state_dict(text_checkpoint["model_state_dict"])
text_model.eval()

MAX_LEN = 100


def encode_text(text):
    tokens = word_tokenize(text.lower())
    encoded = [text_vocab.get(w, 1) for w in tokens]
    encoded = encoded[:MAX_LEN] + [0] * max(0, MAX_LEN - len(encoded))
    return torch.tensor(encoded).unsqueeze(0).to(device)


LABEL_MAP = {
    0: "Angry",
    1: "Disgust",
    2: "Fear",
    3: "Happiness",
    4: "Neutral",
    5: "Confidence",
    6: "Sadness",
}

# --------------------------------------------------
# LOAD VOICE EMOTION MODEL
# --------------------------------------------------

processor = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base")

voice_model = Wav2Vec2ForSequenceClassification.from_pretrained(
    "facebook/wav2vec2-base", num_labels=7
)
voice_model.load_state_dict(torch.load(VOICE_MODEL_PATH, map_location=device))
voice_model.to(device)
voice_model.eval()

# --------------------------------------------------
# LOAD WHISPER
# --------------------------------------------------

whisper_model = whisper.load_model(
    "base", device="cuda" if torch.cuda.is_available() else "cpu"
)
# --------------------------------------------------
# SUPABASE SETUP
# --------------------------------------------------
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
if SUPABASE_URL:
    SUPABASE_URL = SUPABASE_URL.replace("/rest/v1/", "").replace("/rest/v1", "").rstrip("/")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# Two separate clients to prevent auth state contamination:
# - supabase_auth: used ONLY for token validation (get_user)
# - supabase_admin: used for ALL database operations (always uses service role, bypasses RLS)
supabase_auth = create_client(SUPABASE_URL, SUPABASE_KEY)
supabase_admin = create_client(SUPABASE_URL, SUPABASE_KEY)
# --------------------------------------------------
# FLASK APP
# --------------------------------------------------

app = Flask(__name__)
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16 MB max upload size

# Allow CORS for all domains, or restrict using FRONTEND_URL env var if provided
frontend_url = os.environ.get("FRONTEND_URL", "*")
CORS(app, resources={r"/*": {"origins": frontend_url}})

# --------------------------------------------------
# SECURITY: Rate Limiting (memory-backed; Redis optional)
# --------------------------------------------------
REDIS_URL = os.environ.get("REDIS_URL", "")
LIMITER_STORAGE_URI = "memory://"

if REDIS_URL:
    # Sanitize redis-cli prefix if copied from provider dashboard
    for prefix in ("redis-cli -u ", "redis-cli -u"):
        if REDIS_URL.startswith(prefix):
            REDIS_URL = REDIS_URL.replace(prefix, "").replace('"', '').replace("'", "").strip()
    try:
        import redis as _redis
        _r = _redis.from_url(REDIS_URL, socket_connect_timeout=2, socket_timeout=2)
        _r.ping()
        LIMITER_STORAGE_URI = REDIS_URL
        print("Rate limiter: using Redis backend")
    except Exception as _redis_err:
        print(f"Rate limiter: Redis unavailable ({_redis_err}), falling back to in-memory storage")
else:
    print("Rate limiter: No REDIS_URL configured, using in-memory storage")

limiter = Limiter(
    key_func=get_remote_address,
    app=app,
    storage_uri=LIMITER_STORAGE_URI,
    default_limits=["200 per day", "50 per hour"],
    strategy="fixed-window",
)

# --------------------------------------------------
# SECURITY: HTTP Security Headers (Flask-Talisman)
# --------------------------------------------------
# CSP allows necessary CDN resources; adjust as your frontend evolves.
csp = {
    'default-src': "'self'",
    'script-src': "'self'",
    'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
    'font-src': "'self' https://fonts.gstatic.com",
    'img-src': "'self' data: blob:",
    'media-src': "'self' blob: data:",
    'connect-src': "'self' *",  # Allow API calls from any origin (handled by CORS)
}
Talisman(
    app,
    force_https=False,  # HF Spaces manages TLS termination externally
    content_security_policy=csp,
    content_security_policy_nonce_in=['script-src'],
    session_cookie_secure=True,
    session_cookie_http_only=True,
)

# --------------------------------------------------
# SECURITY: Input validation constants
# --------------------------------------------------
MAX_TEXT_INPUT_LENGTH = 2000     # Max chars for text sent to AI models
MAX_EMAIL_LENGTH = 254           # RFC 5321
MAX_PASSWORD_LENGTH = 128
MAX_DESCRIPTION_LENGTH = 500
EMAIL_REGEX = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
# --------------------------------------------------
# AUTH DECORATOR
# --------------------------------------------------


def require_auth(f):
    @wraps(f)
    def wrapper(*args, **kwargs):
        auth_header = request.headers.get("Authorization")

        if not auth_header:
            return jsonify({"error": "Authorization header missing"}), 401

        token = auth_header.replace("Bearer ", "")

        try:
            user = supabase_auth.auth.get_user(token).user
            request.user = user
        except Exception:
            return jsonify({"error": "Invalid or expired token"}), 401

        return f(*args, **kwargs)

    return wrapper


# ---------------- RAG SETUP ----------------

QDRANT_URL = os.getenv("Cluster_End_point")
QDRANT_API_KEY = os.getenv("Api_Key")

qdrant_client = QdrantClient(url=QDRANT_URL, api_key=QDRANT_API_KEY)
RAG_COLLECTION = "emogita_gita"
USER_REFLECTIONS_COLLECTION = "user_reflections"

# Initialize Embedder (This downloads the model if you don't have it)
print("Loading embedding model...")
rag_embedder = SentenceTransformer("all-MiniLM-L6-v2")
print("Model loaded.")

# Initialize User Context Collection
try:
    qdrant_client.get_collection(USER_REFLECTIONS_COLLECTION)
except Exception:
    print(f"Attempting to create collection {USER_REFLECTIONS_COLLECTION}...")
    try:
        qdrant_client.create_collection(
            collection_name=USER_REFLECTIONS_COLLECTION,
            vectors_config=VectorParams(size=384, distance=Distance.COSINE),
        )
    except Exception as e:
        if "already exists" not in str(e).lower():
            raise e

# --------------------------------------------------
# SUPABASE STORAGE BUCKET SETUP
# --------------------------------------------------
TTS_BUCKET = "tts-audio"
try:
    supabase_admin.storage.get_bucket(TTS_BUCKET)
    print(f"Storage bucket '{TTS_BUCKET}' already exists.")
except Exception:
    try:
        supabase_admin.storage.create_bucket(TTS_BUCKET, options={"public": True})
        print(f"Created storage bucket '{TTS_BUCKET}'.")
    except Exception as e:
        print(f"Warning: Could not create storage bucket '{TTS_BUCKET}': {e}")

# --------------------------------------------------
# ROUTES
# --------------------------------------------------


@app.route("/", methods=["GET"])
def health_check():
    return jsonify({"status": "ok", "message": "EmoGita API is running on Hugging Face Spaces!"})

# --------------------------------------------------
# AUTH ROUTES
# --------------------------------------------------
@app.route("/register", methods=["POST"])
@limiter.limit("5 per minute")
def register():
    data = request.get_json()
    if not data or "email" not in data or "password" not in data:
        return jsonify({"error": "Email and password are required"}), 400

    email = str(data["email"]).strip()[:MAX_EMAIL_LENGTH]
    password = str(data["password"])[:MAX_PASSWORD_LENGTH]
    profession = str(data.get("profession", "Other")).strip()[:100]
    description = str(data.get("description", "")).strip()[:MAX_DESCRIPTION_LENGTH]

    # Validate email format
    if not EMAIL_REGEX.match(email):
        return jsonify({"error": "Invalid email format"}), 400

    # Validate password strength
    if len(password) < 8:
        return jsonify({"error": "Password must be at least 8 characters"}), 400

    try:
        # Create user via admin API with email auto-confirmed to avoid Supabase free tier email rate limits
        try:
            res = supabase_admin.auth.admin.create_user({
                "email": email,
                "password": password,
                "email_confirm": True
            })
        except Exception as admin_err:
            admin_msg = str(admin_err).lower()
            if "already been registered" in admin_msg or "already registered" in admin_msg:
                return jsonify({"error": "An account with this email already exists. Please log in."}), 409
            raise admin_err
        
        if not res.user:
            return jsonify({"error": "Registration failed"}), 400

        # Insert user profile
        try:
            supabase_admin.table("user_profiles").upsert({
                "user_id": res.user.id,
                "email": email,
                "profession_category": profession,
                "work_description": description
            }).execute()
        except Exception as pe:
            print("Profile upsert warning:", pe)

        user_data = {"id": res.user.id, "email": res.user.email}
        return jsonify({
            "message": "User registered successfully",
            "user": user_data
        }), 201

    except Exception as e:
        err_msg = str(e)
        print("Registration error:", err_msg)
        if "already been registered" in err_msg.lower() or "already registered" in err_msg.lower():
            return jsonify({"error": "An account with this email already exists. Please log in."}), 409
        elif "rate limit" in err_msg.lower():
            return jsonify({"error": "Signup rate limit exceeded. Please wait a moment."}), 429
        return jsonify({"error": err_msg or "Registration failed. Please try again."}), 400

@app.route("/login", methods=["POST"])
@limiter.limit("5 per minute")
def login():
    data = request.get_json()
    if not data or "email" not in data or "password" not in data:
        return jsonify({"error": "Email and password are required"}), 400

    email = str(data["email"]).strip()[:MAX_EMAIL_LENGTH]
    password = str(data["password"])[:MAX_PASSWORD_LENGTH]

    try:
        res = supabase_auth.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
        
        if not res.session:
            return jsonify({"error": "Invalid email or password"}), 401

        user_data = {"id": res.user.id, "email": res.user.email}
        return jsonify({
            "access_token": res.session.access_token,
            "refresh_token": res.session.refresh_token,
            "user": user_data
        }), 200

    except Exception as e:
        err_msg = str(e)
        print("Login error:", err_msg)
        # If user email was unconfirmed from older sign_up, auto-confirm and retry
        if "email not confirmed" in err_msg.lower():
            try:
                users = supabase_admin.auth.admin.list_users()
                target_user = next((u for u in users if u.email and u.email.lower() == email.lower()), None)
                if target_user:
                    supabase_admin.auth.admin.update_user_by_id(target_user.id, {"email_confirm": True})
                    retry_res = supabase_auth.auth.sign_in_with_password({
                        "email": email,
                        "password": password
                    })
                    if retry_res.session:
                        user_data = {"id": retry_res.user.id, "email": retry_res.user.email}
                        return jsonify({
                            "access_token": retry_res.session.access_token,
                            "refresh_token": retry_res.session.refresh_token,
                            "user": user_data
                        }), 200
            except Exception as auto_conf_err:
                print("Auto-confirm error during login:", auto_conf_err)
        return jsonify({"error": "Invalid email or password"}), 401

@app.route("/predict", methods=["POST"])
@limiter.limit("20 per minute")
def predict_voice_emotion():
    if "audio_data" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    uid = str(uuid.uuid4())
    webm = os.path.join(UPLOAD_FOLDER, f"{uid}.webm")
    wav = os.path.join(UPLOAD_FOLDER, f"{uid}.wav")

    request.files["audio_data"].save(webm)

    audio = AudioSegment.from_file(webm)
    audio = audio.set_frame_rate(16000).set_channels(1).set_sample_width(2)
    audio.export(wav, format="wav")

    waveform, _ = librosa.load(wav, sr=16000)
    inputs = processor(waveform, sampling_rate=16000, return_tensors="pt", padding=True)

    with torch.no_grad():
        logits = voice_model(inputs["input_values"].to(device)).logits
        probs = torch.softmax(logits, dim=1).cpu().numpy()[0]

    pred = int(probs.argmax())

    return jsonify({"emotion": LABEL_MAP[pred], "probabilities": probs.tolist()})


# --------------------------------------------------
# SPEECH TO TEXT ROUTE
# --------------------------------------------------
@app.route("/speech-to-text", methods=["POST"])
@limiter.limit("20 per minute")
def speech_to_text():
    if "audio_data" not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    uid = str(uuid.uuid4())
    webm = os.path.join(UPLOAD_FOLDER, f"{uid}_stt.webm")
    wav = os.path.join(UPLOAD_FOLDER, f"{uid}_stt.wav")

    request.files["audio_data"].save(webm)

    audio = AudioSegment.from_file(webm)
    audio = audio.set_frame_rate(16000).set_channels(1)
    audio.export(wav, format="wav")

    result = whisper_model.transcribe(wav)

    return jsonify({"text": result["text"].strip()})


# --------------------------------------------------
# TEXT EMOTION ROUTE
# --------------------------------------------------
@app.route("/text-emotion", methods=["POST"])
@limiter.limit("30 per minute")
def text_emotion():
    data = request.get_json()
    if not data or "text" not in data:
        return jsonify({"error": "Text not provided"}), 400

    text_input = str(data["text"]).strip()[:MAX_TEXT_INPUT_LENGTH]

    with torch.no_grad():
        input_tensor = encode_text(text_input)
        logits = text_model(input_tensor)
        probs = torch.softmax(logits, dim=1).cpu().numpy()[0]

    pred = int(probs.argmax())

    return jsonify({"emotion": LABEL_MAP[pred], "probabilities": probs.tolist()})


# --------------------------------------------------
# FUSION
# --------------------------------------------------

VOICE_WEIGHT = 0.8
TEXT_WEIGHT = 0.2


def fuse_emotions(voice_probs, text_probs):
    fused = [
        VOICE_WEIGHT * v + TEXT_WEIGHT * t for v, t in zip(voice_probs, text_probs)
    ]
    idx = int(torch.tensor(fused).argmax().item())
    return LABEL_MAP[idx], fused


# --------------------------------------------------
# FUSE EMOTION ROUTE
# --------------------------------------------------
@app.route("/fuse-emotion", methods=["POST"])
def fuse_emotion():
    data = request.get_json()

    if not data or "voice" not in data or "text" not in data:
        return jsonify({"error": "Voice and text emotion data required"}), 400

    voice_probs = data["voice"].get("probabilities") if isinstance(data["voice"], dict) else None
    text_probs = data["text"].get("probabilities") if isinstance(data["text"], dict) else None

    # Handle dictionary representation of probabilities
    if isinstance(voice_probs, dict):
        voice_probs = [float(voice_probs.get(LABEL_MAP[i], voice_probs.get(LABEL_MAP[i].lower(), 0.0))) for i in range(7)]
    if isinstance(text_probs, dict):
        text_probs = [float(text_probs.get(LABEL_MAP[i], text_probs.get(LABEL_MAP[i].lower(), 0.0))) for i in range(7)]

    if not voice_probs or not text_probs or len(voice_probs) != 7 or len(text_probs) != 7:
        return jsonify({"error": "Invalid probability vector"}), 400

    final_emotion, fused_probs = fuse_emotions(voice_probs, text_probs)
    fused_dict = {LABEL_MAP[i]: float(prob) for i, prob in enumerate(fused_probs)}

    return jsonify({
        "final_emotion": final_emotion,
        "fused_probabilities": fused_probs,
        "probabilities": fused_dict
    })


# --------------------------------------------------
# STORE EMOTION HISTORY
# --------------------------------------------------
@app.route("/store-emotion", methods=["POST"])
@require_auth
@limiter.limit("20 per minute")
def store_emotion():
    data = request.get_json()

    if not data or "final_emotion" not in data or "emotion_probabilities" not in data:
        return jsonify({"error": "Invalid payload"}), 400

    # Sanitize inputs
    final_emotion = str(data["final_emotion"]).strip()[:50]
    transcribed_text = str(data.get("transcribedText", "")).strip()[:MAX_TEXT_INPUT_LENGTH] if data.get("transcribedText") else None
    advice_summary = str(data.get("advice_summary", "")).strip()[:5000] if data.get("advice_summary") else None

    result = supabase_admin.table("emotion_history").insert(
        {
            "user_id": request.user.id,
            "final_emotion": final_emotion,
            "emotion_probabilities": data["emotion_probabilities"],
            "transcribed_text": transcribed_text,
            "advice_summary": advice_summary
        }
    ).execute()

    record_id = result.data[0]["id"] if result.data else None

    if transcribed_text:
        try:
            vector = rag_embedder.encode(transcribed_text).tolist()
            point_id = str(uuid.uuid4())
            
            qdrant_client.upsert(
                collection_name=USER_REFLECTIONS_COLLECTION,
                points=[
                    PointStruct(
                        id=point_id,
                        vector=vector,
                        payload={
                            "user_id": request.user.id,
                            "text": transcribed_text,
                            "emotion": final_emotion,
                            "created_at": datetime.now().isoformat()
                        }
                    )
                ]
            )
        except Exception as q_err:
            print("Warning: reflection vector storage failed:", q_err)

    return jsonify({"status": "stored", "id": record_id}), 201


@app.route("/emotion-analytics")
@require_auth
def emotion_analytics():
    try:
        user_id = request.user.id

        response = (
            supabase_admin.table("emotion_history")
            .select("final_emotion, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=False)
            .execute()
        )

        data = response.data

        if not data:
            return jsonify(
                {
                    "stability_score": 50,
                    "trend": "stable",
                    "consecutive_negative": 0,
                    "total_entries": 0,
                }
            )

        scores = [
            EMOTION_SCORE_MAP.get(entry.get("final_emotion", "").lower(), 0) if entry.get("final_emotion") else 0 for entry in data
        ]

        total = len(scores)

        # Stability score based on positive vs negative emotions
        # Average score is between -1 and 1. Normalize to 0-100 scale.
        avg_score = np.mean(scores)
        stability_score = int(((avg_score + 1) / 2) * 100)
        stability_score = max(0, min(100, stability_score))

        # Trend detection using moving average
        window = 5
        if total >= window * 2:
            recent_avg = np.mean(scores[-window:])
            previous_avg = np.mean(scores[-2 * window : -window])

            if recent_avg > previous_avg:
                trend = "improving"
            elif recent_avg < previous_avg:
                trend = "declining"
            else:
                trend = "stable"
        else:
            trend = "stable"

        # Consecutive negative detection
        consecutive_negative = 0
        for score in reversed(scores):
            if score < 0:
                consecutive_negative += 1
            else:
                break

        # Emotion counts
        counts = Counter([entry.get("final_emotion", "").lower() for entry in data if entry.get("final_emotion")])
        emotion_counts = {k.capitalize(): v for k, v in counts.items()}
        for k in ["Angry", "Disgust", "Fear", "Happiness", "Neutral", "Confidence", "Sadness"]:
            emotion_counts.setdefault(k, 0)

        return jsonify(
            {
                "stability_score": stability_score,
                "trend": trend,
                "consecutive_negative": consecutive_negative,
                "streak": {"consecutive_negative": consecutive_negative},
                "total_entries": total,
                "total_sessions": total,
                "emotion_counts": emotion_counts,
            }
        )
    except Exception as e:
        import traceback
        print("ERROR IN emotion_analytics:", e)
        traceback.print_exc()
        return jsonify({"error": "An internal server error occurred"}), 500


@app.route("/emotion-trend")
@require_auth
def emotion_trend():
    try:
        user_id = request.user.id

        response = (
            supabase_admin.table("emotion_history")
            .select("final_emotion, created_at")
            .eq("user_id", user_id)
            .order("created_at", desc=False)
            .execute()
        )

        data = response.data

        if not data:
            return jsonify([])

        scores = [
            EMOTION_SCORE_MAP.get(entry.get("final_emotion", "").lower(), 0) if entry.get("final_emotion") else 0 for entry in data
        ]

        trend_data = []

        for i in range(len(scores)):
            subset = scores[: i + 1]
            
            # Calculate stability for this subset using same logic
            avg_score = np.mean(subset)
            stability = int(((avg_score + 1) / 2) * 100)
            stability = max(0, min(100, stability))

            # Use index `i` plus date to keep lines unique even if on same day
            trend_data.append({
                "date": data[i]["created_at"][:10],
                "score": stability,
                "stability_score": stability,
                "dominant_emotion": data[i].get("final_emotion"),
                "index": i
            })

        return jsonify(trend_data)
    except Exception as e:
        import traceback
        print("ERROR IN emotion_trend:", e)
        traceback.print_exc()
        return jsonify({"error": "An internal server error occurred"}), 500


@app.route("/emotion-history-summary")
@require_auth
def emotion_history_summary():
    try:
        user_id = request.user.id

        response = (
            supabase_admin.table("emotion_history")
            .select("id, final_emotion, created_at, transcribed_text, advice_summary")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(10)
            .execute()
        )

        data = response.data

        # Check which records have stored TTS audio
        audio_ids = set()
        try:
            files = supabase_admin.storage.from_(TTS_BUCKET).list(str(user_id))
            audio_ids = {f["name"].replace(".mp3", "") for f in files} if files else set()
        except Exception as e:
            print(f"Warning: Could not list TTS audio files: {e}")

        summaries = []

        for entry in data:
            emotion = entry.get("final_emotion", "Unknown")
            record_id = str(entry.get("id", ""))
            has_audio = record_id in audio_ids
            
            summary_item = {
                "id": record_id,
                "date": entry["created_at"][:10] if "created_at" in entry else "Unknown",
                "emotion": emotion,
                "summary": f"You were feeling {emotion} during this reflection.",
                "verse_reference": "Bhagavad Gita",
                "transcribed_text": entry.get("transcribed_text"),
                "advice_summary": entry.get("advice_summary"),
                "has_audio": has_audio,
            }

            if has_audio:
                summary_item["audio_url"] = f"{SUPABASE_URL}/storage/v1/object/public/{TTS_BUCKET}/{user_id}/{record_id}.mp3"

            summaries.append(summary_item)

        return jsonify(summaries)
    except Exception as e:
        import traceback
        print("ERROR IN emotion_history_summary:", e)
        traceback.print_exc()
        return jsonify({"error": "An internal server error occurred"}), 500


# --------------------------------------------------
# GET EMOTION HISTORY
# --------------------------------------------------
@app.route("/emotion-history", methods=["GET"])
@require_auth
def get_emotion_history():
    try:
        limit = int(request.args.get("limit", 30))
    except (ValueError, TypeError):
        limit = 30
    limit = max(1, min(limit, 100))  # Clamp to 1-100 to prevent abuse

    response = (
        supabase_admin.table("emotion_history")
        .select("final_emotion, emotion_probabilities, created_at")
        .eq("user_id", request.user.id)
        .order("created_at", desc=True)
        .limit(limit)
        .execute()
    )

    return jsonify(response.data), 200


# --------------------------------------------------
# RAG - BHAGAVAD GITA
# --------------------------------------------------
@app.route("/rag-gita", methods=["POST"])
@require_auth
@limiter.limit("20 per minute")
def search_gita():
    try:
        data = request.get_json()

        if not data or "text" not in data:
            return jsonify({"error": "text is required"}), 400

        query_text = str(data["text"]).strip()[:MAX_TEXT_INPUT_LENGTH]
        emotion = str(data.get("emotion", "Neutral")).strip()[:50]

        if not query_text:
            return jsonify({"error": "text cannot be empty"}), 400

        # 🔹 Emotion-augmented query
        augmented_query = (
            f"The user is experiencing {emotion}. Their situation is: {query_text}"
        )

        query_vector = rag_embedder.encode(augmented_query).tolist()

        # Try to find relevant past context to return alongside verses
        past_context_texts = []
        try:
            native_query_vec = rag_embedder.encode(query_text).tolist()
            if hasattr(qdrant_client, "query_points"):
                past_context_results = qdrant_client.query_points(
                    collection_name=USER_REFLECTIONS_COLLECTION,
                    query=native_query_vec,
                    query_filter=Filter(
                        must=[FieldCondition(key="user_id", match=MatchValue(value=request.user.id))]
                    ),
                    limit=2,
                    with_payload=True,
                ).points
            else:
                past_context_results = qdrant_client.search(
                    collection_name=USER_REFLECTIONS_COLLECTION,
                    query_vector=native_query_vec,
                    query_filter=Filter(
                        must=[FieldCondition(key="user_id", match=MatchValue(value=request.user.id))]
                    ),
                    limit=2,
                    with_payload=True,
                )
            for hit in past_context_results:
                past_context_texts.append(f"Previously felt {hit.payload.get('emotion')}: {hit.payload.get('text')}")
        except Exception as e:
            print(f"Warning: Past Context Qdrant Error: {e}")

        if hasattr(qdrant_client, "query_points"):
            results = qdrant_client.query_points(
                collection_name=RAG_COLLECTION,
                query=query_vector,
                limit=5,
                with_payload=True,
            ).points
        else:
            results = qdrant_client.search(
                collection_name=RAG_COLLECTION,
                query_vector=query_vector,
                limit=5,
                with_payload=True,
            )

        verses = []
        for hit in results:
            verses.append(
                {
                    "chapter": hit.payload.get("chapter"),
                    "verse": hit.payload.get("verse"),
                    "text": hit.payload.get("text"),
                    "emotion": hit.payload.get("emotion"),
                    "score": hit.score,
                }
            )

        return jsonify({"status": "success", "results": verses, "past_context": past_context_texts})

    except Exception as e:
        print("RAG Error:", e)
        return jsonify({"error": "An internal server error occurred"}), 500


@app.route("/rag-gita-explain", methods=["POST"])
@require_auth
@limiter.limit("10 per minute")
def rag_gita_explain():
    try:
        data = request.get_json()

        user_text = str(data.get("text", "")).strip()[:MAX_TEXT_INPUT_LENGTH]
        emotion = str(data.get("emotion", "")).strip()[:50]
        verses = data.get("verses")
        past_context = data.get("past_context", [])

        if not user_text or not emotion or not verses:
            return jsonify({"error": "Missing required fields"}), 400

        verses_text = "\n".join(
            [f"Chapter {v['chapter']}, Verse {v['verse']}: {v['text']}" for v in verses]
        )

        context_str = ""
        if past_context:
            context_str = "\n\nRelevant past reflections from the user:\n" + "\n".join(past_context)

        prompt = f"""
You are an empathetic spiritual guide inspired by the Bhagavad Gita.

User situation:
"{user_text}"

Detected emotional state:
"{emotion}"{context_str}

Relevant Bhagavad Gita verses:
{verses_text}

Instructions:
1. Reflect the user's situation in simple words.
2. If relevant past reflections are provided, acknowledge them softly to show you understand their ongoing journey. Empathize with how their feelings might be evolving or repeating based on the past.
3. Explain how the Bhagavad Gita verses relate to this situation.
4. Provide calm, practical guidance inspired by Krishna.
5. Keep the tone compassionate and non-preachy.
6. Do not quote verses excessively; explain their meaning.

Structure the response as:
- Understanding the situation
- Gita-based guidance
- Practical takeaway
- Do not give excessive philosophical discourse; focus on actionable insights and keep the explanation concise.
"""

        explanation = generate_gemini_content(prompt)

        return jsonify({"status": "success", "explanation": explanation})

    except Exception as e:
        print("Gemini RAG Explain Error:", e)
        return jsonify({"error": "An internal server error occurred"}), 500


@app.route("/rag-gita-verse-explain", methods=["POST"])
@require_auth
@limiter.limit("20 per minute")
def rag_gita_verse_explain():
    try:
        data = request.get_json()

        user_text = str(data.get("text", "")).strip()[:MAX_TEXT_INPUT_LENGTH]
        emotion = str(data.get("emotion", "")).strip()[:50]
        verse = data.get("verse")

        if not user_text or not emotion or not verse:
            return jsonify({"error": "Missing required fields"}), 400

        prompt = f"""
You are a compassionate spiritual guide inspired by the Bhagavad Gita.

User situation:
"{user_text}"

User emotional state:
"{emotion}"

Bhagavad Gita verse:
Chapter {verse["chapter"]}, Verse {verse["verse"]}:
"{verse["text"]}"

Task:
Explain in 1–2 sentences why this verse is relevant to the user's situation
and emotional state. Be clear, supportive, and practical.
"""

        reason = generate_gemini_content(prompt)

        return jsonify({"reason": reason.strip()})

    except Exception as e:
        print("Verse Explain Error:", e)
        return jsonify({"error": "An internal server error occurred"}), 500


# --------------------------------------------------
# TTS GENERATION
# --------------------------------------------------

def generate_tts(text, voice_id):
    """Generate MP3 audio from text using edge-tts with gTTS fallback."""
    import edge_tts
    import io
    from gtts import gTTS

    async def _synthesize():
        communicate = edge_tts.Communicate(text, voice_id)
        audio_chunks = []
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                audio_chunks.append(chunk["data"])
        return b"".join(audio_chunks)

    try:
        loop = asyncio.new_event_loop()
        audio_bytes = loop.run_until_complete(_synthesize())
        loop.close()
        if audio_bytes and len(audio_bytes) > 0:
            return audio_bytes
    except Exception as e:
        print(f"edge-tts Generation Warning ({e}), falling back to gTTS...")

    try:
        tts = gTTS(text, lang="en", tld="co.in")
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        return fp.read()
    except Exception as gtts_err:
        print(f"gTTS fallback failed: {gtts_err}")
        raise


@app.route("/tts-generate", methods=["POST"])
@require_auth
@limiter.limit("10 per minute")
def tts_generate():
    try:
        data = request.get_json()

        text = str(data.get("text", "")).strip()[:MAX_TEXT_INPUT_LENGTH]
        emotion = str(data.get("emotion", "neutral")).lower().strip()[:50]
        record_id = data.get("record_id")  # If provided, audio will be stored

        if not text:
            return jsonify({"error": "Text is required"}), 400

        # Get voice_id for the detected emotion
        voice_id = TTS_VOICE_MAP.get(emotion, TTS_DEFAULT_VOICE)

        print(f"TTS: Generating audio for emotion='{emotion}', voice_id='{voice_id}', text_len={len(text)}")

        # Generate audio via Mistral Voxtral
        audio_bytes = generate_tts(text, voice_id)

        if not audio_bytes:
            return jsonify({"error": "TTS generation produced no audio"}), 500

        # Encode as base64 for immediate frontend playback
        audio_b64 = base64.b64encode(audio_bytes).decode("utf-8")

        response_data = {
            "audio_b64": audio_b64,
            "content_type": "audio/mpeg",
        }

        # If record_id is provided, persist audio to Supabase Storage
        if record_id:
            try:
                user_id = request.user.id
                file_path = f"{user_id}/{record_id}.mp3"

                # Upload to Supabase Storage
                supabase_admin.storage.from_(TTS_BUCKET).upload(
                    file_path,
                    audio_bytes,
                    {"content-type": "audio/mpeg"}
                )

                audio_url = f"{SUPABASE_URL}/storage/v1/object/public/{TTS_BUCKET}/{file_path}"
                response_data["audio_url"] = audio_url
                print(f"TTS: Audio stored at {audio_url}")
            except Exception as upload_err:
                print(f"TTS: Storage upload failed (audio still playable): {upload_err}")

        return jsonify(response_data)

    except Exception as e:
        import traceback
        print("TTS Generate Error:", e)
        traceback.print_exc()
        return jsonify({"error": "An internal server error occurred"}), 500


# --------------------------------------------------
# RUN
# --------------------------------------------------

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 7860))
    app.run(host="0.0.0.0", port=port, debug=False)
