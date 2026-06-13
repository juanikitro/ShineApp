/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.platform === "win32" ? undefined : "standalone",
  // El lint corre como paso propio (npm run lint, advisory en CI). El build
  // no debe fallar por reglas de ESLint: se mantiene desacoplado mientras las
  // reglas estan en baseline (ver docs/plans/2026-06-12-refactor-mantenibilidad.md,
  // Track H endurece los gates).
  eslint: {
    ignoreDuringBuilds: true,
  },
  experimental: {
    cpus: 1,
    webpackBuildWorker: false,
    staticGenerationMaxConcurrency: 1,
    optimizePackageImports: [
      "lucide-react",
      "motion",
      "emoji-picker-react",
      "@dnd-kit/core",
    ],
  },
};

export default nextConfig;
