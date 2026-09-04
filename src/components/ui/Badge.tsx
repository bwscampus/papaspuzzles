import type { ReactNode } from 'react';

type Tone = 'neutral' | 'rose' | 'accent' | 'success' | 'warn' | 'danger' | 'info';

const TONES: Record<Tone, string> = {
    neutral: 'bg-rose-faint text-muted',
    rose: 'bg-rose-tint text-primary',
    accent: 'bg-accent/30 text-accent-text',
    success: 'bg-success/10 text-success',
    warn: 'bg-warn/10 text-warn',
    danger: 'bg-danger/10 text-danger',
    info: 'bg-cream text-ink',
};

export function Badge({
    tone = 'neutral',
    children,
    className = '',
}: {
    tone?: Tone;
    children: ReactNode;
    className?: string;
}) {
    return (
        <span
            className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]} ${className}`}
        >
            {children}
        </span>
    );
}
