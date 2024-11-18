import type { NextConfig } from "next";
import { version } from "./package.json";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_VERSION: version,
  },
  /* config options here */
};

export default nextConfig;
