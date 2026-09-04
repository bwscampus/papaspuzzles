import type { ReactNode } from 'react';

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: ReactNode }) {
    return (
        <div className="rounded-2xl border-2 border-dashed border-rose/50 bg-white/60 px-6 py-12 text-center">
            <h3 className="text-lg">{title}</h3>
            {text && <p className="mt-2 text-sm text-muted">{text}</p>}
            {action && <div className="mt-5 flex justify-center">{action}</div>}
        </div>
    );
}
