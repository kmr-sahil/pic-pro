import type { NextConfig } from "next";

const bucket = process.env.S3_BUCKET_NAME;
const region = process.env.AWS_REGION;

const nextConfig: NextConfig = {
  images: {
    // Grid tiles only ever need a few hundred pixels — let the optimizer
    // downscale the originals sitting in S3 instead of shipping them whole.
    remotePatterns:
      bucket && region
        ? [
            {
              protocol: "https",
              hostname: `${bucket}.s3.${region}.amazonaws.com`,
              pathname: "/**",
            },
          ]
        : [],
  },
};

export default nextConfig;
