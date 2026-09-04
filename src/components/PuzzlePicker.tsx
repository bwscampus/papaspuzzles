'use client';

import { useEffect, useState } from 'react';
import { api, errorMessage } from '@/lib/client/api';
import type { PublicPuzzle } from '@/lib/types';
import { PuzzleCard } from './PuzzleCard';
import { PuzzleFilters, type Filters } from './PuzzleFilters';
import { Alert } from './ui/Alert';
import { EmptyState } from './ui/EmptyState';
import { Spinner } from './ui/Spinner';

/** Grid of available puzzles with selection. `max` caps multi-select (e.g. credit balance). */
export function PuzzlePicker({
    selected,
    onChange,
    mode = 'single',
    max = Infinity,
    onLoaded,
}: {
    selected: string[];
    onChange: (ids: string[]) => void;
    mode?: 'single' | 'multi';
    max?: number;
    onLoaded?: (puzzles: PublicPuzzle[]) => void;
}) {
    const [filters, setFilters] = useState<Filters>({ theme: '', pieces: '' });
    const [puzzles, setPuzzles] = useState<PublicPuzzle[] | null>(null);
    const [error, setError] = useState('');

    useEffect(() => {
        let cancelled = false;
        const params = new URLSearchParams();
        if (filters.theme) params.set('theme', filters.theme);
        if (filters.pieces) params.set('pieces', filters.pieces);
        api.get<PublicPuzzle[]>(`/api/puzzles?${params}`)
            .then((data) => {
                if (cancelled) return;
                setPuzzles(data);
                onLoaded?.(data);
            })
            .catch((err) => {
                if (!cancelled) setError(errorMessage(err));
            });
        return () => {
            cancelled = true;
        };
        // onLoaded is intentionally excluded: callers pass inline functions and only need the latest data.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    const toggle = (id: string) => {
        if (mode === 'single') {
            onChange(selected.includes(id) ? [] : [id]);
            return;
        }
        if (selected.includes(id)) onChange(selected.filter((s) => s !== id));
        else if (selected.length < max) onChange([...selected, id]);
    };

    const full = mode === 'multi' && selected.length >= max;

    return (
        <div className="flex flex-col gap-6">
            <PuzzleFilters value={filters} onChange={setFilters} />
            {error ? (
                <Alert tone="error">{error}</Alert>
            ) : puzzles === null ? (
                <div className="flex justify-center py-16 text-primary">
                    <Spinner className="h-8 w-8" />
                </div>
            ) : puzzles.length === 0 ? (
                <EmptyState title="No puzzles match" text="Try clearing a filter, or check back soon." />
            ) : (
                <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {puzzles.map((p) => {
                        const isSelected = selected.includes(p.id);
                        return (
                            <li key={p.id}>
                                <PuzzleCard
                                    puzzle={p}
                                    selectable
                                    selected={isSelected}
                                    disabled={full && !isSelected}
                                    onToggle={() => toggle(p.id)}
                                />
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
