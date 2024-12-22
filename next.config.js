/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: [
      "images.ctfassets.net",
      "ozdnkwutbejwpesxahms.supabase.co",
      "sdbooth2-production.s3.amazonaws.com", // Added S3 bucket domain
    ],
  },
};

module.exports = nextConfig;
