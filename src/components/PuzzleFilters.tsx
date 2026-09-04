'use client';

import { PIECES, THEMES, pieceLabel } from '@/lib/constants';
import { Select } from './ui/Field';

export interface Filters {
    theme: string;
    pieces: string;
}

export function PuzzleFilters({ value, onChange }: { value: Filters; onChange: (next: Filters) => void }) {
    const active = value.theme || value.pieces;
    return (
        <div className="flex flex-wrap items-end gap-4 rounded-2xl bg-white p-4 shadow-card">
            <Select
                label="Pieces"
                value={value.pieces}
                onChange={(e) => onChange({ ...value, pieces: e.target.value })}
                placeholder="All"
                options={PIECES.map((p) => ({ value: p, label: pieceLabel(p) }))}
                className="w-36"
            />
            <Select
                label="Theme"
                value={value.theme}
                onChange={(e) => onChange({ ...value, theme: e.target.value })}
                placeholder="All"
                options={THEMES.map((t) => ({ value: t, label: t }))}
                className="w-44"
            />
            {active && (
                <button
                    type="button"
                    onClick={() => onChange({ theme: '', pieces: '' })}
                    className="pb-2.5 text-sm font-semibold text-primary hover:underline"
                >
                    Clear filters
                </button>
            )}
        </div>
    );
}
