import type { Metadata } from 'next';
import { Inter, Nunito } from 'next/font/google';
import './globals.css';
import { Footer } from '@/components/Footer';
import { Navbar } from '@/components/Navbar';
import { Providers } from '@/components/Providers';
import { SITE } from '@/content/site';

const nunito = Nunito({ subsets: ['latin'], variable: '--font-nunito', weight: ['700', '800'] });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
    title: { default: SITE.name, template: `%s · ${SITE.name}` },
    description: SITE.phrase,
    icons: { icon: '/logo.png' },
    openGraph: { title: SITE.name, description: SITE.phrase, images: ['/logo.png'] },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <html lang="en" className={`${nunito.variable} ${inter.variable}`}>
            <body className="flex min-h-screen flex-col">
                <Providers>
                    <Navbar />
                    <div className="flex-1">{children}</div>
                    <Footer />
                </Providers>
            </body>
        </html>
    );
}
