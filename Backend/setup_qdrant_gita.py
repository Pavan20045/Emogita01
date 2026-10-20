import os
import pandas as pd
from dotenv import load_dotenv
from sentence_transformers import SentenceTransformer
from qdrant_client import QdrantClient
from qdrant_client.models import PointStruct, VectorParams, Distance

# --------------------------------------------------
# ENV VARIABLES
# --------------------------------------------------
load_dotenv(override=True)

QDRANT_URL = os.environ.get("Cluster_End_point") or os.environ.get("QDRANT_URL")
QDRANT_API_KEY = os.environ.get("Api_Key") or os.environ.get("QDRANT_API_KEY")

if not QDRANT_URL or not QDRANT_API_KEY:
    raise ValueError("Missing Qdrant URL or API key in environment / .env")

# --------------------------------------------------
# CONNECT TO QDRANT CLOUD
# --------------------------------------------------
print(f"Connecting to Qdrant: {QDRANT_URL}")
client = QdrantClient(
    url=QDRANT_URL,
    api_key=QDRANT_API_KEY,
    timeout=60
)

COLLECTION_NAME = "emogita_gita"

# --------------------------------------------------
# EMBEDDING MODEL
# --------------------------------------------------
print("Loading embedding model 'all-MiniLM-L6-v2'...")
embedder = SentenceTransformer("all-MiniLM-L6-v2")
VECTOR_SIZE = 384

# --------------------------------------------------
# CREATE COLLECTION
# --------------------------------------------------
if not client.collection_exists(COLLECTION_NAME):
    client.create_collection(
        collection_name=COLLECTION_NAME,
        vectors_config=VectorParams(
            size=VECTOR_SIZE,
            distance=Distance.COSINE
        )
    )
    print(f"Collection '{COLLECTION_NAME}' created.")
else:
    print(f"Collection '{COLLECTION_NAME}' already exists.")

# --------------------------------------------------
# LOAD XLSX
# --------------------------------------------------
print("Reading Bhagwad_Gita.xlsx...")
df = pd.read_excel("Bhagwad_Gita.xlsx")

# --------------------------------------------------
# BUILD POINTS (VALID QDRANT IDS)
# --------------------------------------------------
points = []
point_id = 0  # Valid integer ID

for _, row in df.iterrows():
    try:
        chapter = int(row["Chapter"])
        verse = int(row["Verse"])
        eng_text = str(row.get("EngMeaning", "")).strip()
        sanskrit = str(row.get("Shloka", "")).strip()

        if not eng_text or eng_text.lower() == "nan":
            continue

        text = f"Chapter {chapter}, Verse {verse}:\n{eng_text}"
        vector = embedder.encode(text).tolist()

        points.append(
            PointStruct(
                id=point_id,
                vector=vector,
                payload={
                    "chapter": chapter,
                    "verse": verse,
                    "emotion": "Neutral",
                    "text": text,
                    "sanskrit": sanskrit
                }
            )
        )
        point_id += 1

    except Exception as e:
        continue

print(f"Prepared {len(points)} vectors.")

# --------------------------------------------------
# BATCH UPSERT (CLOUD SAFE)
# --------------------------------------------------
def batch_upsert(client, collection_name, points, batch_size=64):
    total_batches = (len(points) + batch_size - 1) // batch_size
    for i in range(0, len(points), batch_size):
        batch = points[i:i + batch_size]
        client.upsert(
            collection_name=collection_name,
            points=batch
        )
        print(f"Upserted batch {i // batch_size + 1}/{total_batches}")

batch_upsert(
    client=client,
    collection_name=COLLECTION_NAME,
    points=points,
    batch_size=64
)

print(f"Successfully inserted {len(points)} Bhagavad Gita verses into Qdrant collection '{COLLECTION_NAME}'.")
