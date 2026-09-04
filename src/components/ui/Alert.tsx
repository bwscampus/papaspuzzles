import type { ReactNode } from 'react';

type Tone = 'info' | 'success' | 'warn' | 'error';

const TONES: Record<Tone, string> = {
    info: 'border-rose/40 bg-rose-faint text-ink',
    success: 'border-success/30 bg-success/5 text-success',
    warn: 'border-warn/30 bg-warn/5 text-warn',
    error: 'border-danger/30 bg-danger/5 text-danger',
};

export function Alert({
    tone = 'info',
    title,
    children,
    className = '',
}: {
    tone?: Tone;
    title?: string;
    children?: ReactNode;
    className?: string;
}) {
    return (
        <div
            role={tone === 'error' ? 'alert' : 'status'}
            className={`rounded-xl border px-4 py-3 text-sm ${TONES[tone]} ${className}`}
        >
            {title && <p className="font-semibold">{title}</p>}
            {children && <div className={title ? 'mt-1' : ''}>{children}</div>}
        </div>
    );
}
