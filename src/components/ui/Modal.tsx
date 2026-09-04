'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

export function Modal({
    open,
    onClose,
    title,
    children,
}: {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}) {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog
            ref={ref}
            aria-labelledby="modal-title"
            onClose={onClose}
            onClick={(e) => {
                // A click on the backdrop lands on the dialog element itself, not its children.
                if (e.target === ref.current) onClose();
            }}
            className="w-full max-w-md rounded-2xl bg-white p-0 text-ink shadow-card backdrop:bg-ink/60"
        >
            <div className="p-8">
                <div className="mb-6 flex items-start justify-between gap-4">
                    <h2 id="modal-title" className="text-xl">
                        {title}
                    </h2>
                    <button
                        type="button"
                        onClick={onClose}
                        aria-label="Close"
                        className="rounded-full p-1 text-muted hover:bg-rose-faint hover:text-ink"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>
                {children}
            </div>
        </dialog>
    );
}
