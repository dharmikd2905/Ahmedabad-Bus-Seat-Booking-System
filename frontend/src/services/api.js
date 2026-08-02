import axios from "axios";

const api = axios.create({
  // Keep browser requests on the frontend origin. Vite proxies /api to the
  // backend in development and nginx does the same in production.
  baseURL: "/api",
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  const adminToken = localStorage.getItem("adminToken");
  const isAdminCall = config.url?.includes("/admin");
  const selectedToken = isAdminCall ? adminToken || token : token;
  if (selectedToken) config.headers.Authorization = `Bearer ${selectedToken}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const serverMsg = error.response?.data?.message;

    if (status === 401 && (serverMsg === "Unauthorized" || serverMsg === "Invalid token")) {
      error.response.data.message = "Please sign in to book tickets and manage your bookings.";
    }
    return Promise.reject(error);
  }
);

export default api;
