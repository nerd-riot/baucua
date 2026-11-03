/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@bau-cua/types', '@bau-cua/engine'],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
