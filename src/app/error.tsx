'use client';

import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';

/** Error boundary for server or render failures. Distinct from the 404 page so they are not confused. */
export default function ErrorPage({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <main className="mx-auto flex max-w-xl flex-col items-center px-4 py-24 text-center">
            <h1 className="text-4xl">Something went wrong</h1>
            <p className="mt-3 text-muted">
                The page hit an error on our side. Please try again in a moment.
                {error.digest && <span className="mt-2 block text-xs">Reference: {error.digest}</span>}
            </p>
            <div className="mt-8 flex gap-3">
                <Button onClick={reset}>Try again</Button>
                <Button href="/" variant="outline">
                    Back to home
                </Button>
            </div>
        </main>
    );
}
