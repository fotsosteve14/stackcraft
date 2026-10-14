import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The generation engine is consumed as TypeScript source from the workspace.
  transpilePackages: ["@stackcraft/core"],
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
