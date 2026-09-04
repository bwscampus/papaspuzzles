import type { HTMLAttributes, ReactNode } from 'react';

export function Card({
    children,
    className = '',
    padded = true,
    ...rest
}: { children: ReactNode; className?: string; padded?: boolean } & HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={`rounded-2xl bg-white shadow-card ${padded ? 'p-6' : ''} ${className}`} {...rest}>
            {children}
        </div>
    );
}
