/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Allow verification builds alongside a running local dev server.
  distDir: process.env.PASSPORT_BUILD_DIR || ".next",
  async redirects() {
    return [
      { source: "/admin", destination: "/trainer", permanent: false },
      { source: "/admin/:path+", destination: "/trainer/:path+", permanent: false },
      { source: "/passport", destination: "/trainee/dashboard", permanent: false },
      { source: "/passport/:path+", destination: "/trainee/dashboard/:path+", permanent: false },
    ];
  },
};

export default nextConfig;
