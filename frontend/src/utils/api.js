import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || "https://mockmate-1-mahk.onrender.com";

export const api = axios.create({
  baseURL: API_BASE_URL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export async function registerUser(payload) {
  const { data } = await api.post("/api/auth/register", payload);
  return data;
}

export async function loginUser(payload) {
  const { data } = await api.post("/api/auth/login", payload);
  return data;
}

export async function generateQuestion(payload) {
  const { data } = await api.post("/api/ai/question", payload);
  return data;
}

export async function evaluateAnswer(payload) {
  const { data } = await api.post("/api/ai/evaluate", payload);
  return data;
}

export async function saveInterviewHistory(payload) {
  const { data } = await api.post("/api/user/history", payload);
  return data;
}

export async function getInterviewHistory() {
  const { data } = await api.get("/api/user/history");
  return data;
}

export async function generateRoadmapAI(payload) {
  const { data } = await api.post("/api/ai/roadmap", payload);
  return data;
}

export async function mentorChatAI(payload) {
  const { data } = await api.post("/api/ai/mentor-chat", payload);
  return data;
}

export async function interviewStep(payload) {
  const { data } = await api.post("/api/ai/interview-step", payload);
  return data;
}

export async function parseResume(file, domain) {
  const formData = new FormData();
  formData.append("resume", file);
  formData.append("domain", domain);
  const { data } = await api.post("/api/ai/resume/parse", formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
}

export async function getUserProfile() {
  const { data } = await api.get("/api/user/profile");
  return data;
}

export async function updateUserProfile(payload) {
  const { data } = await api.put("/api/user/profile", payload);
  return data;
}

export async function updateUserSettings(payload) {
  const { data } = await api.put("/api/user/settings", payload);
  return data;
}

export async function changePassword(payload) {
  const { data } = await api.put("/api/user/change-password", payload);
  return data;
}

export async function deleteAccount() {
  const { data } = await api.delete("/api/user/account");
  return data;
}
