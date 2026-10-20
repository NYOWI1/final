/** @type {import('next').NextConfig} */
const nextConfig = {
  ...(process.env.NEXT_TEST_DIST ? { distDir: process.env.NEXT_TEST_DIST } : {}),
};
export default nextConfig;
