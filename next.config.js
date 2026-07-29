/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { hostname: "*.supabase.co" },
      { hostname: "tile.openstreetmap.org" },
    ],
    unoptimized: true,
  },
};
module.exports = nextConfig;