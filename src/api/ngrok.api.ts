import axios from "axios";

/**
 * Cliente axios para el endpoint ngrok de carga de imágenes externas.
 * Configura las cabeceras fijas requeridas por el servicio:
 *   - ngrok-skip-browser-warning: omite la pantalla de advertencia de ngrok free tier.
 *   - Authorization: token Bearer estático del servicio externo.
 *
 * ⚠️  Define en .env.local:
 *   NEXT_PUBLIC_NGROK_BASE_URL=https://<tu-subdominio>.ngrok-free.dev
 *   NEXT_PUBLIC_NGROK_API_TOKEN=<token>
 */
export const ngrok_api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_NGROK_BASE_URL,
  headers: {
    "ngrok-skip-browser-warning": "true",
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_NGROK_API_TOKEN}`,
  },
});
