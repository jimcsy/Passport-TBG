/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
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
