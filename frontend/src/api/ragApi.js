const API_BASE = process.env.REACT_APP_API_BASE || "https://pavanrocks2045-emogita-backend.hf.space";

export async function fetchGitaVerses(text, emotion) {
  const sessionStr = localStorage.getItem("emogita_session");
  if (!sessionStr) {
    throw new Error("User not authenticated");
  }

  let sessionData;
  try {
    sessionData = JSON.parse(sessionStr);
  } catch (e) {
    throw new Error("Invalid session data");
  }

  const response = await fetch(`${API_BASE}/rag-gita`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${sessionData.access_token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      text,
      emotion
    })
  });

  if (!response.ok) {
    throw new Error("RAG request failed");
  }

  return response.json();
}
