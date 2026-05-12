import axios from "axios";
import toast from "react-hot-toast";

// FIX: Was hardcoded to "http://localhost:8000/api".
// Now reads from REACT_APP_API_URL env var, falling back to localhost for dev.
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || "http://localhost:8000/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (!err.response) {
      // Network error — no response received
      toast.error("Cannot connect to server. Please check your connection.");
      return Promise.reject(err);
    }

    const status = err.response.status;

    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    } else if (status === 403) {
      toast.error("You don't have permission to perform this action.");
    } else if (status >= 500) {
      toast.error("Server error, please try again later.");
    }

    return Promise.reject(err);
  }
);

export default api;
