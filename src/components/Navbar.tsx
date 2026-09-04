'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { LogIn, LogOut, Menu, Shield, X } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { SITE } from '@/content/site';
import { Button } from './ui/Button';

const LINKS = [
    { href: '/explore', label: 'Explore' },
    { href: '/donate', label: 'Donate' },
    { href: '/credits', label: 'Use Your Credits' },
    { href: '/my-trades', label: 'My Trades' },
    { href: '/about', label: 'About Us' },
];

export function Navbar() {
    const { user, loading, signOut, openAuthDialog } = useAuth();
    const toast = useToast();
    const [open, setOpen] = useState(false);

    const handleSignOut = async () => {
        await signOut();
        toast.info('Signed out.');
        setOpen(false);
    };

    const authControls = user ? (
        <div className="flex items-center gap-3">
            {user.isAdmin && (
                <Link
                    href="/admin"
                    className="flex items-center gap-1 text-sm font-semibold text-accent-text hover:underline"
                >
                    <Shield className="h-4 w-4" aria-hidden="true" /> Admin
                </Link>
            )}
            <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-primary font-display text-sm font-bold text-white"
                title={user.email}
                aria-label={`Signed in as ${user.email}`}
            >
                {(user.displayName || user.email).charAt(0).toUpperCase()}
            </span>
            <button
                type="button"
                onClick={handleSignOut}
                className="flex items-center gap-1 text-sm font-medium text-muted hover:text-primary"
            >
                <LogOut className="h-4 w-4" aria-hidden="true" /> Sign out
            </button>
        </div>
    ) : (
        <button
            type="button"
            onClick={() => openAuthDialog('signin')}
            className="flex items-center gap-1 text-sm font-medium text-muted hover:text-primary"
        >
            <LogIn className="h-4 w-4" aria-hidden="true" /> Sign in
        </button>
    );

    return (
        <header className="sticky top-0 z-40 border-b border-rose/30 bg-white/95 backdrop-blur">
            <nav
                aria-label="Main"
                className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"
            >
                <Link href="/" className="flex items-center gap-2">
                    <Image src="/logo.png" alt="" width={40} height={40} className="rounded-full" priority />
                    <span className="font-display text-xl font-bold text-primary">{SITE.name}</span>
                </Link>

                <div className="hidden items-center gap-6 md:flex">
                    {LINKS.map((l) => (
                        <Link
                            key={l.href}
                            href={l.href}
                            className="text-sm font-medium text-muted hover:text-primary"
                        >
                            {l.label}
                        </Link>
                    ))}
                    <Button href="/trade" size="sm">
                        Start a Trade
                    </Button>
                    {!loading && authControls}
                </div>

                <button
                    type="button"
                    className="rounded-full p-2 text-primary md:hidden"
                    aria-expanded={open}
                    aria-controls="mobile-menu"
                    aria-label={open ? 'Close menu' : 'Open menu'}
                    onClick={() => setOpen((v) => !v)}
                >
                    {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
                </button>
            </nav>

            {open && (
                <div id="mobile-menu" className="border-t border-rose/30 bg-white px-4 py-4 md:hidden">
                    <div className="flex flex-col gap-3">
                        {LINKS.map((l) => (
                            <Link
                                key={l.href}
                                href={l.href}
                                onClick={() => setOpen(false)}
                                className="text-base font-medium text-ink"
                            >
                                {l.label}
                            </Link>
                        ))}
                        <Button href="/trade">Start a Trade</Button>
                        {!loading && <div className="pt-2">{authControls}</div>}
                    </div>
                </div>
            )}
        </header>
    );
}
