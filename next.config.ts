import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // O PGlite carrega WASM e arquivos próprios: empacotado pelo Turbopack ele quebra
  // ("path argument must be of type string ... Received an instance of URL"). Fora do
  // pacote do servidor, o Node o carrega por require nativo e ele funciona.
  serverExternalPackages: ['@electric-sql/pglite'],
  partialPrefetching: true,
  // Anexos de processo (até 10 MB) chegam por Server Action, cujo corpo tem limite padrão de 1 MB.
  // A folga de 2 MB cobre o envelope do multipart.
  experimental: { serverActions: { bodySizeLimit: '12mb' } },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
