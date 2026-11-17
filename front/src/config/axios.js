import axiosOriginal from "axios";

// Basado en Movilidad-Urbana-Front/src/config/axiosFront.js (cierre de sesión ante "Invalid token")
// y en MapaInteractivo/config/axios.js (token agregado por interceptor).
const axios = axiosOriginal.create({ baseURL: import.meta.env.VITE_APP_RUTA_BACK });

export const URL_CIUDAD_DIGITAL = import.meta.env.VITE_APP_URL_CIUDAD_DIGITAL || "https://ciudaddigital.smt.gob.ar/";

// Vuelve al portal de Ciudad Digital, que es quien hace el login.
export const salirACiudadDigital = () => {
  localStorage.removeItem("token");
  const url = new URL(URL_CIUDAD_DIGITAL);
  url.searchParams.append("logout", true);
  window.open(url.toString(), "_self");
};

// El token de Ciudad Digital va tal cual en Authorization (sin "Bearer"), como en el resto de las apps.
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = token;
  return config;
});

// Si el token venció, el back responde 401 "Invalid token": se limpia la sesión y se vuelve al portal.
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const tokenInvalido = error.response?.status === 401 && error.response?.data?.message === "Invalid token";
    if (tokenInvalido && localStorage.getItem("token")) salirACiudadDigital();
    return Promise.reject(error);
  },
);

export default axios;
