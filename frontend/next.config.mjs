/** @type {import('next').NextConfig} */
const nextConfig = {
  output: process.platform === "win32" ? undefined : "standalone",
  experimental: {
    staticGenerationMaxConcurrency: 1,
  },
};

export default nextConfig;
