import Link from 'next/link';
import { SITE } from '@/content/site';

export function Footer() {
    return (
        <footer className="mt-16 border-t border-rose/30 bg-white">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted sm:flex-row sm:px-6 lg:px-8">
                <p>
                    © {new Date().getFullYear()} {SITE.name}. {SITE.phrase}
                </p>
                <div className="flex items-center gap-5">
                    <Link href="/about" className="hover:text-primary">
                        About Us
                    </Link>
                    <a href={`mailto:${SITE.contactEmail}`} className="hover:text-primary">
                        {SITE.contactEmail}
                    </a>
                </div>
            </div>
        </footer>
    );
}
