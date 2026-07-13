/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@repairflow/shared-types", "@repairflow/validation"],
};

module.exports = nextConfig;
