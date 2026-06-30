import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  allowedDevOrigins: ["*.space-z.ai", "*.chatglm.cn"],
  outputFileTracingIncludes: {
    "**/*": ["./db/**/*", "./.z-ai-config"],
  },
};

export default nextConfig;
