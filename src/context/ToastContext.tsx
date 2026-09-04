'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type Kind = 'success' | 'error' | 'info';

interface Toast {
    id: number;
    kind: Kind;
    message: string;
}

interface ToastApi {
    success: (message: string) => void;
    error: (message: string) => void;
    info: (message: string) => void;
}

const ToastContext = createContext<ToastApi>({ success: () => {}, error: () => {}, info: () => {} });

const STYLES: Record<Kind, string> = {
    success: 'border-success/30 bg-white text-success',
    error: 'border-danger/30 bg-white text-danger',
    info: 'border-rose/40 bg-white text-ink',
};

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const nextId = useRef(1);

    const push = useCallback((kind: Kind, message: string) => {
        const id = nextId.current++;
        setToasts((list) => [...list, { id, kind, message }]);
        setTimeout(
            () => setToasts((list) => list.filter((t) => t.id !== id)),
            kind === 'error' ? 7000 : 4500
        );
    }, []);

    const api = useMemo<ToastApi>(
        () => ({
            success: (m) => push('success', m),
            error: (m) => push('error', m),
            info: (m) => push('info', m),
        }),
        [push]
    );

    return (
        <ToastContext.Provider value={api}>
            {children}
            <div
                aria-live="polite"
                role="status"
                className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] flex flex-col items-center gap-2 px-4"
            >
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`pointer-events-auto max-w-md rounded-2xl border px-4 py-3 text-sm font-medium shadow-card ${STYLES[t.kind]}`}
                    >
                        {t.message}
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast(): ToastApi {
    return useContext(ToastContext);
}
