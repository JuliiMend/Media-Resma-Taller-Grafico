const backend = process.env.BACKEND_URL || "https://media-resma-taller-grafico.onrender.com";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // The deployed backend does not send CORS headers, so the browser talks to /api and Next forwards it.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${backend}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
        ],
      },
    ];
  },
};

export default nextConfig;
