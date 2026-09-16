/** @type {import('next').NextConfig} */
const nextConfig = {
    // Uploaded images are served from this app at /uploads/<name>, so no remote image hosts are needed.
    images: {
        remotePatterns: [],
    },
    // Railway keeps its auto-generated production hostname attached alongside the custom domain.
    // Send anyone using the old address to the real one so links and bookmarks keep working.
    async redirects() {
        return [
            {
                source: '/:path*',
                has: [{ type: 'host', value: 'papaspuzzles-production.up.railway.app' }],
                destination: 'https://www.papaspuzzles.org/:path*',
                permanent: true,
            },
        ];
    },
};

export default nextConfig;
