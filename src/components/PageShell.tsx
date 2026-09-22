import type { ReactNode } from 'react';

export function PageShell({
    title,
    width = 'default',
    actions,
    children,
}: {
    title: string;
    width?: 'narrow' | 'default' | 'wide';
    actions?: ReactNode;
    children: ReactNode;
}) {
    const max = width === 'narrow' ? 'max-w-2xl' : width === 'wide' ? 'max-w-7xl' : 'max-w-5xl';
    return (
        <main className={`mx-auto w-full ${max} px-4 py-10 sm:px-6 lg:px-8`}>
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <h1 className="text-3xl sm:text-4xl">{title}</h1>
                {actions}
            </div>
            {children}
        </main>
    );
}
