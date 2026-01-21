import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["@node-rs/argon2"],
  cacheComponents: true,
}

export default nextConfig
