'use client';

import { useEffect, useState } from 'react';
import { PageShell } from '@/components/PageShell';
import { PuzzleCard } from '@/components/PuzzleCard';
import { PuzzleFilters, type Filters } from '@/components/PuzzleFilters';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { api, errorMessage } from '@/lib/client/api';
import type { PublicPuzzle } from '@/lib/types';

export default function ExplorePage() {
    const { user } = useAuth();
    const [filters, setFilters] = useState<Filters>({ theme: '', pieces: '' });
    const [puzzles, setPuzzles] = useState<PublicPuzzle[] | null>(null);
    const [error, setError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        const params = new URLSearchParams();
        if (filters.theme) params.set('theme', filters.theme);
        if (filters.pieces) params.set('pieces', filters.pieces);
        setError('');
        api.get<PublicPuzzle[]>(`/api/puzzles?${params}`)
            .then((data) => {
                if (!cancelled) setPuzzles(data);
            })
            .catch((err) => {
                if (!cancelled) setError(errorMessage(err));
            });
        return () => {
            cancelled = true;
        };
    }, [filters, reloadKey]);

    return (
        <PageShell
            title="Explore"
            subtitle="Every puzzle here is available right now. Pick one to start a trade, or use your credits."
            width="wide"
        >
            <PuzzleFilters value={filters} onChange={setFilters} />

            <div className="mt-8">
                {error ? (
                    <Alert tone="error" title="Could not load puzzles">
                        <p>{error}</p>
                        <Button
                            size="sm"
                            variant="outline"
                            className="mt-3"
                            onClick={() => setReloadKey((k) => k + 1)}
                        >
                            Try again
                        </Button>
                    </Alert>
                ) : puzzles === null ? (
                    <div className="flex justify-center py-20 text-primary">
                        <Spinner className="h-8 w-8" />
                    </div>
                ) : puzzles.length === 0 ? (
                    <EmptyState
                        title={
                            filters.theme || filters.pieces
                                ? 'No puzzles match those filters'
                                : 'No puzzles yet'
                        }
                        text={
                            filters.theme || filters.pieces
                                ? 'Try clearing a filter.'
                                : 'Be the first to donate one and earn credits.'
                        }
                        action={
                            filters.theme || filters.pieces ? (
                                <Button
                                    variant="outline"
                                    onClick={() => setFilters({ theme: '', pieces: '' })}
                                >
                                    Clear filters
                                </Button>
                            ) : (
                                <Button href="/donate">Donate a puzzle</Button>
                            )
                        }
                    />
                ) : (
                    <>
                        <p className="mb-4 text-sm text-muted" aria-live="polite">
                            {puzzles.length} puzzle{puzzles.length === 1 ? '' : 's'} available
                        </p>
                        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {puzzles.map((p) => (
                                <li key={p.id}>
                                    <PuzzleCard
                                        puzzle={p}
                                        action={
                                            <div className="flex flex-col gap-2">
                                                <Button
                                                    href={`/trade?wanted=${p.id}`}
                                                    size="sm"
                                                    className="w-full"
                                                >
                                                    Start a Trade
                                                </Button>
                                                {user && (
                                                    <Button
                                                        href={`/credits?pick=${p.id}`}
                                                        size="sm"
                                                        variant="ghost"
                                                        className="w-full"
                                                    >
                                                        Use credits
                                                    </Button>
                                                )}
                                            </div>
                                        }
                                    />
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </PageShell>
    );
}
