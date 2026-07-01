import type { NextConfig } from "next";

// Izinkan next/image mengoptimasi gambar dari Supabase Storage (webp/resize otomatis).
const supaHost = process.env.NEXT_PUBLIC_SUPABASE_URL
  ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname
  : undefined;

const nextConfig: NextConfig = {
  images: supaHost
    ? {
        remotePatterns: [
          { protocol: "https", hostname: supaHost, pathname: "/storage/v1/object/public/**" },
        ],
      }
    : undefined,
};

export default nextConfig;
