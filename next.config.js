/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true
  },
  webpack: (config, { isServer }) => {
    // Handle ONNX runtime
    config.resolve.alias = {
      ...config.resolve.alias,
      'onnxruntime-node': 'onnxruntime-web',
    };

    // Handle binary files
    config.module.rules.push({
      test: /\.node$/,
      use: 'node-loader',
    });

    return config;
  },
}

module.exports = nextConfig 