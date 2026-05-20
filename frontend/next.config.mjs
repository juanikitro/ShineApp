/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.platform === "win32" ? undefined : "standalone",
  experimental: {
    cpus: 1,
    webpackBuildWorker: false,
    staticGenerationMaxConcurrency: 1,
  },
};

export default nextConfig;
