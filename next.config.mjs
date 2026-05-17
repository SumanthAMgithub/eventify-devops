/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    domains: ["images.unsplash.com", "img.clerk.com"],
  },
};

export default nextConfig;
