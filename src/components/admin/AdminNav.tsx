'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
    { href: '/admin/puzzles', label: 'Puzzles' },
    { href: '/admin/inventory', label: 'Add Inventory' },
    { href: '/admin/trades', label: 'Trades' },
    { href: '/admin/donations', label: 'Donations & Credits' },
    { href: '/admin/users', label: 'Users' },
];

export function AdminNav() {
    const pathname = usePathname();
    return (
        <nav aria-label="Admin sections" className="-mx-4 overflow-x-auto px-4">
            <ul className="flex gap-2 border-b border-rose/40">
                {TABS.map((t) => {
                    const active = pathname.startsWith(t.href);
                    return (
                        <li key={t.href}>
                            <Link
                                href={t.href}
                                aria-current={active ? 'page' : undefined}
                                className={`inline-block whitespace-nowrap border-b-2 px-4 py-3 text-sm font-semibold ${
                                    active
                                        ? 'border-primary text-primary'
                                        : 'border-transparent text-muted hover:text-primary'
                                }`}
                            >
                                {t.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
