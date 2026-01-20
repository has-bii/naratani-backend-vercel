import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["@node-rs/argon2"],
  headers: async () => {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",") || []

    return allowedOrigins.map((origin) => ({
      source: "/:path*",
      headers: [
        { key: "Access-Control-Allow-Origin", value: origin.trim() },
        { key: "Access-Control-Allow-Methods", value: "GET, POST, PUT, DELETE, OPTIONS" },
        { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
        { key: "Access-Control-Allow-Credentials", value: "true" },
      ],
    }))
  },
}

export default nextConfig
