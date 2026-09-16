import type { Config } from 'tailwindcss';

// Palette derived from the logo (dusty rose circle, salmon and cream pieces).
// Every text/background pairing used in the UI meets WCAG AA. See docs/technical-design.md §9.1.
const config: Config = {
    content: ['./src/**/*.{ts,tsx}'],
    theme: {
        extend: {
            colors: {
                // Button fill matches the logo's dusty-rose background; dark ink text on it is 6.2:1.
                primary: { DEFAULT: '#C49AA2', hover: '#B3868F', text: '#7E4B57' },
                rose: { DEFAULT: '#C49AA2', tint: '#F3E3E6', faint: '#FBF4F5' },
                accent: { DEFAULT: '#F2A48E', text: '#A8503A' },
                page: '#FFFBEA',
                cream: '#FFF6C8',
                ink: '#2E2226',
                muted: '#6B5A5F',
                success: '#2F7A4F',
                warn: '#9A6B00',
                danger: '#B3261E',
            },
            fontFamily: {
                display: ['var(--font-nunito)', 'ui-rounded', 'system-ui', 'sans-serif'],
                sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
            },
            boxShadow: {
                card: '0 1px 2px rgba(46, 34, 38, 0.06), 0 8px 24px rgba(46, 34, 38, 0.08)',
            },
        },
    },
    plugins: [],
};

export default config;
