import { randomBytes } from "node:crypto";
import type { NextConfig } from "next";

// One asset-signing secret per build, shared by every server instance (signing.ts); the env var wins when set.
process.env.SKYLINE_ASSET_SECRET ||= randomBytes(32).toString("hex");

const nextConfig: NextConfig = {
  devIndicators: false,
  env: { SKYLINE_ASSET_SECRET: process.env.SKYLINE_ASSET_SECRET },
};

export default nextConfig;
