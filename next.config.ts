import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
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
