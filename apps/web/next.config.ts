import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@projeto-g2g/shared'],
  async rewrites() {
    const apiTarget = process.env.API_PROXY_TARGET;
    if (!apiTarget) {
      return [];
    }
    return [
      {
        source: '/api/:path*',
        destination: `${apiTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
