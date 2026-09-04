'use client';

import { useCallback, useEffect, useState } from 'react';
import { useToast } from '@/context/ToastContext';
import { api, errorMessage } from '@/lib/client/api';

/** Loads an admin list and exposes a `run` helper that performs an action, toasts, and reloads. */
export function useAdminData<T>(path: string) {
    const toast = useToast();
    const [data, setData] = useState<T | null>(null);
    const [error, setError] = useState('');
    const [busyId, setBusyId] = useState<string | null>(null);

    const reload = useCallback(async () => {
        try {
            setData(await api.get<T>(path));
            setError('');
        } catch (err) {
            setError(errorMessage(err));
        }
    }, [path]);

    useEffect(() => {
        void reload();
    }, [reload]);

    const run = useCallback(
        async (
            id: string,
            action: () => Promise<unknown>,
            successMessage: string | ((result: unknown) => string)
        ) => {
            setBusyId(id);
            try {
                const result = await action();
                toast.success(typeof successMessage === 'function' ? successMessage(result) : successMessage);
                await reload();
            } catch (err) {
                toast.error(errorMessage(err));
            } finally {
                setBusyId(null);
            }
        },
        [reload, toast]
    );

    return { data, error, reload, run, busyId };
}
