import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  // Przykładowe PDF-y są czytane z dysku przez API – na Vercel muszą trafić do paczki funkcji.
  outputFileTracingIncludes: {
    "/api/documents/analyze": ["./public/samples/**/*"],
    "/api/forms": ["./public/formularze/**/*"],
    "/api/forms/prefill": ["./public/formularze/**/*", "./public/fonts/**/*"],
  },
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
