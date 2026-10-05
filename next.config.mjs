const isDev = process.env.NODE_ENV !== 'production';

// Everything the site loads is same-origin: next/font self-hosts the fonts, photos are served from
// /uploads on this app, and there are no third-party scripts. Next.js injects inline bootstrap
// scripts, so script-src needs 'unsafe-inline' until a nonce-based policy is added via middleware.
// Development additionally needs 'unsafe-eval' for React Refresh.
const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
].join('; ');

// Production Standard API-4.
const securityHeaders = [
    { key: 'Content-Security-Policy', value: contentSecurityPolicy },
    { key: 'Strict-Transport-Security', value: 'max-age=15552000; includeSubDomains' },
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    // Also keeps the reset/verification token in the URL from leaking via Referer.
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
    poweredByHeader: false,
    // Uploaded images are served from this app at /uploads/<name>, so no remote image hosts are needed.
    images: {
        remotePatterns: [],
    },
    async headers() {
        return [{ source: '/:path*', headers: securityHeaders }];
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
