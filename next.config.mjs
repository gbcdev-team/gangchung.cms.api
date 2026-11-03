/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "swagger-ui-react",
    "swagger-client",
    "react-syntax-highlighter",
  ],
  reactStrictMode: true,
  // 대표 이미지(최대 5MB) + 본문이 한 번의 Server Action으로 전송된다(기본 1MB).
  experimental: {
    serverActions: { bodySizeLimit: "6mb" },
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
      },
    ],
  },
};

export default nextConfig;
