import type { NextConfig } from "next";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: join(__dirname, "../.."),
  transpilePackages: [
    "@openskills/core",
    "@openskills/db",
    "@openskills/recorder",
    "@openskills/replay",
    "@openskills/synthesis",
    "@openskills/ai",
  ],
  serverExternalPackages: ["playwright"],
};

export default nextConfig;
