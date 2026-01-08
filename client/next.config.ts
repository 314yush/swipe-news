import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  /* config options here */
  // Fix workspace root detection - explicitly set to client directory
  // Note: turbo.root is not a valid experimental config option in Next.js 16
  // The warning about multiple lockfiles can be ignored or fixed by removing the parent lockfile
  // experimental: {
  //   turbo: {
  //     root: path.join(__dirname),
  //   },
  // },
};

export default nextConfig;
