import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  serverExternalPackages: ["@dtelecom/x402-client"],
  turbopack: {
    root: resolve(import.meta.dirname),
  },
};

export default nextConfig;
