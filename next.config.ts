import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  output: "standalone",
  experimental: {
    // Los PDF de la bandeja (hasta 20 MB, RNF-0006) llegan por Server Action
    // y atraviesan el middleware del panel: ambos límites deben admitirlos,
    // con margen para la sobrecarga del multipart.
    serverActions: { bodySizeLimit: "21mb" },
    proxyClientMaxBodySize: "21mb",
  },
  headers() {
    return Promise.resolve([
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Content-Security-Policy',
            value: "default-src 'self'; script-src 'self';"
          }
        ],
      },
    ]);
  },
};

export default nextConfig;
