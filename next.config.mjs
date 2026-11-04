import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.resolve.modules = [
      path.resolve(__dirname, 'node_modules'),
      'node_modules',
    ];
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      process: path.resolve(__dirname, 'node_modules/next/dist/compiled/process/browser.js'),
    };
    return config;
  },
};

export default nextConfig;
