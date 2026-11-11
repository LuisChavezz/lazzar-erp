import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // Sin esta cabecera aplica el default del navegador
  // (`strict-origin-when-cross-origin`): las subpeticiones al mismo origen
  // (`/_next/*`, `/api/auth/*`) llevaban la URL completa, query incluida, en el
  // Referer. `strict-origin` deja solo el origen en todas partes; hacia otros
  // orígenes (backend, Zebra, ngrok) se envía exactamente lo mismo que antes.
  // No `no-referrer`: pondría `Origin: null` en los POST al mismo origen y
  // rompería cualquier Server Action. `headers` corre antes que redirects y el
  // proxy, así que también cubre los 307/308 (EC-864).
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [{ key: "Referrer-Policy", value: "strict-origin" }],
      },
    ];
  },
  // El módulo de Envío vivía en /wms/dispatch antes del rename a /wms/shipping.
  // El redirect mantiene vivos los bookmarks y enlaces compartidos previos.
  async redirects() {
    return [
      {
        source: "/wms/dispatch",
        destination: "/wms/shipping",
        permanent: true,
      },
      // El menú de reportes se volvió el landing del módulo (cada reporte
      // tiene su ruta). No permanente: un 308 queda en la caché del navegador
      // y `/system/reports` podría volver a ser una página.
      {
        source: "/system/reports",
        destination: "/system",
        permanent: false,
      },
    ];
  },
  images: {
    qualities: [75, 80, 90],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'raw.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'dl.dropboxusercontent.com',
      },
    ],
  },
};

export default nextConfig;
