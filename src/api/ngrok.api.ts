import "server-only";
import axios from "axios";

/**
 * Cliente axios para el servidor de archivos interno expuesto vía túnel ngrok.
 *
 * SOLO-SERVIDOR (`import "server-only"`): el token es el secreto compartido de
 * ese servidor y autoriza tanto listar galerías como ESCRIBIR archivos en el
 * recurso compartido. Antes se leía de `NEXT_PUBLIC_NGROK_API_TOKEN`, lo que
 * lo incrustaba en el bundle del navegador y lo dejaba a la vista de cualquiera
 * con devtools; ahora vive en `NGROK_API_TOKEN` y solo lo usan los Route
 * Handlers de `/api/embroidery-images`.
 *
 * `NEXT_PUBLIC_NGROK_BASE_URL` sigue siendo pública a propósito: es un hostname,
 * no una credencial, y el cliente la necesita para construir y renderizar las
 * URLs absolutas de las imágenes ya almacenadas.
 *
 * ⚠️  Define en .env.local:
 *   NEXT_PUBLIC_NGROK_BASE_URL=https://<tu-subdominio>.ngrok-free.dev
 *   NGROK_API_TOKEN=<token>
 */
const getNgrokConfig = () => {
  const baseURL = process.env.NEXT_PUBLIC_NGROK_BASE_URL;
  const token = process.env.NGROK_API_TOKEN;

  if (!baseURL || !token) {
    throw new Error("Missing ngrok environment variables.");
  }

  return { baseURL, token };
};

const ngrok_api = axios.create({
  headers: {
    // Omite la pantalla de advertencia del free tier de ngrok.
    "ngrok-skip-browser-warning": "true",
  },
  proxy: false,
});

/* Configuración perezosa (mismo patrón que `facturama.api.ts`): resolver las
 * variables por petición hace que una variable faltante falle con un error
 * claro, en vez de mandar silenciosamente `Bearer undefined` al servidor de
 * archivos y recibir un 401 difícil de diagnosticar. */
ngrok_api.interceptors.request.use((config) => {
  const { baseURL, token } = getNgrokConfig();

  config.baseURL = config.baseURL ?? baseURL;
  config.headers.set("Authorization", `Bearer ${token}`);

  return config;
});

export { ngrok_api };
