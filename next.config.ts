import type { NextConfig } from 'next';

// GitHub Pages serves project sites from /<repo>; the deploy workflow sets this.
const basePath = process.env.PAGES_BASE_PATH ?? '';

const nextConfig: NextConfig = {
    output: 'export',
    basePath,
    trailingSlash: true,
    env: {
        NEXT_PUBLIC_BASE_PATH: basePath,
    },
};

export default nextConfig;
