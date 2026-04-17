/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.openai.com' },
      { protocol: 'https', hostname: 'oaidalleapiprodscus.blob.core.windows.net' },
      { protocol: 'https', hostname: '**.stability.ai' },
      { protocol: 'https', hostname: '**.replicate.delivery' },
    ],
  },
};

module.exports = nextConfig;
