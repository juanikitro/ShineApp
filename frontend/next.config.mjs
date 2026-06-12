/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.platform === "win32" ? undefined : "standalone",
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
