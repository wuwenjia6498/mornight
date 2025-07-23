/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // 解决文件系统依赖问题
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }
    return config;
  },
  
  // 图片优化
  images: {
    domains: ['images.unsplash.com', 'unsplash.com'],
    formats: ['image/webp', 'image/avif'],
  },
};

module.exports = nextConfig; 