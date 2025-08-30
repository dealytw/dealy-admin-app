/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['ag-grid-community', 'ag-grid-react'],
  },
  webpack: (config) => {
    config.externals = [...(config.externals || []), 'canvas', 'jsdom'];
    return config;
  },
  images: {
    domains: ['localhost'],
  },
  env: {
    STRAPI_URL: process.env.STRAPI_URL,
  },
}

module.exports = nextConfig
