import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
    };


    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /node_modules\/thread-stream\/(test|LICENSE|bench\.js)/,
      use: 'null-loader',
    });

    return config;
  },

  turbopack: {},
};

export default nextConfig;
