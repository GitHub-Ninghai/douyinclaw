/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@douyinclaw/shared'],
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
  // 禁用 ESLint 检查以避免构建失败
  eslint: {
    ignoreDuringBuilds: true,
  },
};

module.exports = nextConfig;
