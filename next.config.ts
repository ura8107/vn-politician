import type { NextConfig } from "next";

const nextConfig: NextConfig = {};

export default nextConfig;

// Makes the Cloudflare bindings (D1, KV, vars) available through
// getCloudflareContext() while running `next dev`.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

void initOpenNextCloudflareForDev();
