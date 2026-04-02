import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const API = axios.create({
  baseURL: BASE_URL,
});

// Attach token automatically
API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const register = (data) => API.post("/auth/register", data);
export const login = (data) => API.post("/auth/login", data);

export async function refreshAccessToken() {
  const refreshToken = localStorage.getItem("refresh_token");

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  const response = await API.post(`/refresh?refresh_token=${encodeURIComponent(refreshToken)}`);
  const { access_token: accessToken, refresh_token: newRefreshToken } = response.data;

  localStorage.setItem("token", accessToken);
  localStorage.setItem("refresh_token", newRefreshToken);

  return accessToken;
}

export default API;
