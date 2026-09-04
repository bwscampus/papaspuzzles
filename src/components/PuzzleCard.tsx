import type { ReactNode } from 'react';
import { CONDITION_LABELS, pieceLabel } from '@/lib/constants';
import type { PublicPuzzle } from '@/lib/types';
import { Badge } from './ui/Badge';

export function PuzzleCard({
    puzzle,
    action,
    selectable = false,
    selected = false,
    disabled = false,
    onToggle,
}: {
    puzzle: PublicPuzzle;
    action?: ReactNode;
    selectable?: boolean;
    selected?: boolean;
    disabled?: boolean;
    onToggle?: () => void;
}) {
    const body = (
        <>
            <div className="relative aspect-[4/3] overflow-hidden bg-rose-faint">
                {/* Uploaded photos are served from this app; next/image would add nothing here. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                    src={puzzle.imageUrl}
                    alt={puzzle.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                />
                <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-xs font-bold text-ink shadow-sm">
                    {pieceLabel(puzzle.pieces)} pcs
                </span>
                {selectable && selected && (
                    <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-xs font-bold text-white">
                        Selected
                    </span>
                )}
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4">
                <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg leading-tight">{puzzle.name}</h3>
                    <Badge tone="neutral">{CONDITION_LABELS[puzzle.condition]}</Badge>
                </div>
                <p className="text-sm text-muted">{puzzle.theme}</p>
                {action && <div className="mt-auto pt-1">{action}</div>}
            </div>
        </>
    );

    const frame = `flex h-full flex-col overflow-hidden rounded-2xl bg-white text-left shadow-card transition ${
        selected ? 'ring-2 ring-primary' : ''
    }`;

    if (selectable) {
        return (
            <button
                type="button"
                onClick={onToggle}
                disabled={disabled}
                aria-pressed={selected}
                className={`${frame} focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${disabled ? '' : 'hover:-translate-y-0.5'}`}
            >
                {body}
            </button>
        );
    }
    return <article className={frame}>{body}</article>;
}
