import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  // O PGlite carrega WASM e arquivos próprios: empacotado pelo Turbopack ele quebra
  // ("path argument must be of type string ... Received an instance of URL"). Fora do
  // pacote do servidor, o Node o carrega por require nativo e ele funciona.
  serverExternalPackages: ['@electric-sql/pglite'],
  partialPrefetching: true,
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
