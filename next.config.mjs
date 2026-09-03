/** @type {import('next').NextConfig} */
const nextConfig = {
    // Uploaded images are served from this app at /uploads/<name>, so no remote image hosts are needed.
    images: {
        remotePatterns: [],
    },
};

export default nextConfig;
