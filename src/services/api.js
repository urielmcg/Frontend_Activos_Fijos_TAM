import axios from "axios";

// 1. Detectamos la URL base.
// En LAN usamos el hostname actual para que sirva tanto en localhost como en 192.168.x.x
const getDefaultApiUrl = () => {
  const host = window.location.hostname;
  // Si estamos en localhost, usa localhost:8000, si no usa el host actual (ej 192.168.1.241:8000)
  if (host === "localhost" || host === "127.0.0.1") return "http://localhost:8000/api/";
  return `http://${host}:8000/api/`;
};
const BASE_URL_API = process.env.VUE_APP_API_URL && !process.env.VUE_APP_API_URL.includes("siaem.tamep.bo") 
  ? process.env.VUE_APP_API_URL 
  : getDefaultApiUrl();

const api = axios.create({
  baseURL: BASE_URL_API,
});

// --- INTERCEPTOR DE PETICIÓN ---
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access");

  if (token && token !== "undefined" && token !== "null") {
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    delete config.headers.Authorization;
  }

  return config;
});

// --- INTERCEPTOR DE RESPUESTA ---
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry && !originalRequest.url.includes("login")) {
      originalRequest._retry = true;

      const refresh = localStorage.getItem("refresh");

      if (!refresh || refresh === "undefined") {
        // No redirigir si ya estamos en login/signup para evitar loop
        if (window.location.pathname !== "/signin" && window.location.pathname !== "/signup") {
          localStorage.clear();
          window.location.href = "/signin";
        }
        return Promise.reject(error);
      }

      try {
        // 2. ¡OJO AQUÍ! Cambiamos la URL fija por la variable dinámica
        const response = await axios.post(
          `${BASE_URL_API}token/refresh/`, 
          { refresh }
        );

        const nuevoAccess = response.data.access;
        localStorage.setItem("access", nuevoAccess);

        originalRequest.headers.Authorization = `Bearer ${nuevoAccess}`;

        return api(originalRequest);

      } catch (err) {
        if (window.location.pathname !== "/signin" && window.location.pathname !== "/signup") {
          localStorage.clear();
          window.location.href = "/signin";
        }
        return Promise.reject(err);
      }
    }

    return Promise.reject(error);
  }
);

export default api;