'use client';

import { useMemo } from 'react';
import { DataTable, type Column } from '@/components/admin/DataTable';
import { useAdminData } from '@/components/admin/useAdminData';
import { Alert } from '@/components/ui/Alert';
import { Spinner } from '@/components/ui/Spinner';
import type { WaitlistEntry, WaitlistSource } from '@/lib/types';

const SOURCE_LABELS: Record<WaitlistSource, string> = {
    trade: 'Start a Trade',
    donate: 'Donate',
    page: 'Waitlist page',
};

export default function AdminWaitlistPage() {
    const { data, error } = useAdminData<WaitlistEntry[]>('/api/admin/waitlist');

    const columns = useMemo<Column<WaitlistEntry>[]>(
        () => [
            { key: 'email', header: 'Email', render: (w) => w.email },
            { key: 'zip', header: 'ZIP code', render: (w) => w.zip },
            { key: 'source', header: 'Signed up from', render: (w) => SOURCE_LABELS[w.source] },
            { key: 'joined', header: 'Joined', render: (w) => new Date(w.createdAt).toLocaleDateString() },
        ],
        []
    );

    return error ? (
        <Alert tone="error">{error}</Alert>
    ) : data === null ? (
        <div className="flex justify-center py-16 text-primary-text">
            <Spinner className="h-8 w-8" />
        </div>
    ) : (
        <DataTable columns={columns} rows={data} emptyText="Nobody on the waitlist yet." />
    );
}
