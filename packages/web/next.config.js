/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@douyinclaw/shared'],
  // standalone 在 Windows 上有权限问题，开发时禁用
  // Docker 构建时在 Linux 环境中会启用
  // output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
  },
};

module.exports = nextConfig;
