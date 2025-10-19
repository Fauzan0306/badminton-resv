import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**', // izinkan semua domain eksternal sementara
      },
    ],
  },
};

export default nextConfig;
