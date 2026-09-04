'use client';

import { Plus, Trash2 } from 'lucide-react';
import { emptyDraft, type DraftErrors, type PuzzleDraft } from '@/lib/client/puzzleDraft';
import { MAX_PUZZLES_PER_SUBMISSION } from '@/lib/constants';
import { PuzzleForm } from './PuzzleForm';
import { Button } from './ui/Button';

export function PuzzleFormList({
    items,
    onChange,
    errors = {},
    fixedCount,
    min = 1,
    max = MAX_PUZZLES_PER_SUBMISSION,
}: {
    items: PuzzleDraft[];
    onChange: (items: PuzzleDraft[]) => void;
    errors?: Record<string, DraftErrors>;
    /** When set, exactly this many forms are shown and cannot be added or removed (trade tiers). */
    fixedCount?: number;
    min?: number;
    max?: number;
}) {
    const locked = fixedCount !== undefined;

    return (
        <div className="flex flex-col gap-6">
            {items.map((draft, i) => (
                <section
                    key={draft.key}
                    className="rounded-2xl bg-white p-6 shadow-card"
                    aria-labelledby={`${draft.key}-h`}
                >
                    <div className="mb-4 flex items-center justify-between">
                        <h3 id={`${draft.key}-h`} className="text-lg">
                            Puzzle {i + 1}
                        </h3>
                        {!locked && items.length > min && (
                            <button
                                type="button"
                                onClick={() => onChange(items.filter((d) => d.key !== draft.key))}
                                className="flex items-center gap-1 text-sm text-muted hover:text-danger"
                            >
                                <Trash2 className="h-4 w-4" aria-hidden="true" /> Remove
                            </button>
                        )}
                    </div>
                    <PuzzleForm
                        value={draft}
                        onChange={(next) => onChange(items.map((d) => (d.key === draft.key ? next : d)))}
                        errors={errors[draft.key]}
                    />
                </section>
            ))}
            {!locked && items.length < max && (
                <Button
                    variant="outline"
                    onClick={() => onChange([...items, emptyDraft()])}
                    className="self-start"
                >
                    <Plus className="h-4 w-4" aria-hidden="true" /> Add Another Puzzle
                </Button>
            )}
        </div>
    );
}
