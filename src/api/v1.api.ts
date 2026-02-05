import axios from "axios";
import { getSession, signOut } from "next-auth/react";

const v1_api = axios.create({
  baseURL: "http://192.168.0.15:8003/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para inyectar el token en cada petición
v1_api.interceptors.request.use(async (config) => {
  // Omitir inyección de token en endpoint de login
  if (config.url?.includes("/login/")) {
    return config;
  }

  // Obtiene la sesión actual
  const session = await getSession();
  
  // Inyecta el token en el encabezado Authorization si existe
  if (session?.user?.accessToken) {
    config.headers.Authorization = `Bearer ${session.user.accessToken}`;
  }
  
  return config;
});

// Interceptor para manejar errores 401 (No autorizado)
v1_api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Solo ejecutar signOut en el lado del cliente
      if (typeof window !== "undefined") {
        await signOut({ callbackUrl: "/auth/login" });
      }
    }
    return Promise.reject(error);
  }
);

export { v1_api };
