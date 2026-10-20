import axios from "axios";

const API_BASE = process.env.REACT_APP_API_BASE || "https://pavanrocks2045-emogita-backend.hf.space";

export const sendAudioForVoiceEmotion = async (audioBlob) => {
  const formData = new FormData();
  formData.append("audio_data", audioBlob);

  const res = await axios.post(`${API_BASE}/predict`, formData);
  return res.data;
};

export const speechToText = async (audioBlob) => {
  const formData = new FormData();
  formData.append("audio_data", audioBlob);

  const res = await axios.post(`${API_BASE}/speech-to-text`, formData);
  return res.data;
};

export const textEmotion = async (text) => {
  const res = await axios.post(`${API_BASE}/text-emotion`, {
    text,
  });
  return res.data;
};

export const fuseEmotion = async (voiceData, textData) => {
  const res = await axios.post(`${API_BASE}/fuse-emotion`, {
    voice: voiceData,
    text: textData,
  });
  return res.data;
};
