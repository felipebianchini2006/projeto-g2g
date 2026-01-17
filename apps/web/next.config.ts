import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@projeto-g2g/shared'],
  async rewrites() {
    const apiTarget =
      process.env['API_PROXY_TARGET'] ??
      process.env['API_INTERNAL_URL'] ??
      'http://localhost:3001';
    if (!apiTarget) {
      return [];
    }
    return [
      {
        source: '/api/proxy/:path*',
        destination: `${apiTarget}/:path*`,
      },
      {
        source: '/api/:path*',
        destination: `${apiTarget}/:path*`,
      },
    ];
  },
};

export default nextConfig;
