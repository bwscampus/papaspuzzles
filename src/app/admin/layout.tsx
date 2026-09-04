import { notFound } from 'next/navigation';
import type { ReactNode } from 'react';
import { AdminNav } from '@/components/admin/AdminNav';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/** Server-side gate: anyone who is not an admin gets a 404, so the area is invisible. */
export default async function AdminLayout({ children }: { children: ReactNode }) {
    const user = await getCurrentUser();
    if (!user?.isAdmin) notFound();

    return (
        <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                <h1 className="text-3xl">Admin</h1>
                <p className="text-sm text-muted">Signed in as {user.email}</p>
            </div>
            <AdminNav />
            <div className="mt-8">{children}</div>
        </main>
    );
}
