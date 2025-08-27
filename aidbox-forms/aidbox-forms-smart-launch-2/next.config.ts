import type { NextConfig } from "next";
import { version } from "./package.json";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_VERSION: version,
  },
  output: "standalone",
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};

export default nextConfig;
