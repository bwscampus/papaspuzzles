import Script from 'next/script';

const GA_MEASUREMENT_ID = 'G-1NBZ6P9EB4';

// Only loads in production so local development doesn't show up in the analytics.
export function GoogleAnalytics() {
    if (process.env.NODE_ENV !== 'production') return null;
    return (
        <>
            <Script
                src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
                strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
                {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${GA_MEASUREMENT_ID}');`}
            </Script>
        </>
    );
}
