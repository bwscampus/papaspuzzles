// Product vocabulary. Every enum-like value used by the UI, API, and database
// lives here so the three cannot drift apart. Database CHECK constraints in
// db/migrations mirror these lists.

export const THEMES = ['Animals', 'Landscape', 'Art', 'Food', 'Cityscape', 'Movies', 'Other'] as const;

/** Stored as the lower bound; 2000 is displayed as "2000+". */
export const PIECES = [100, 300, 500, 1000, 2000] as const;

export const CONDITIONS = ['new', 'good', 'fair'] as const;
export const CONDITION_LABELS: Record<(typeof CONDITIONS)[number], string> = {
    new: 'New',
    good: 'Good',
    fair: 'Fair',
};

export const PUZZLE_STATUSES = [
    'pending_review',
    'available',
    'reserved',
    'traded',
    'claimed',
    'rejected',
] as const;
export const PUZZLE_STATUS_LABELS: Record<(typeof PUZZLE_STATUSES)[number], string> = {
    pending_review: 'Pending review',
    available: 'Available',
    reserved: 'Reserved',
    traded: 'Traded',
    claimed: 'Claimed',
    rejected: 'Rejected',
};

export const PUZZLE_SOURCES = ['donation', 'trade', 'admin'] as const;

export const TRADE_STATUSES = ['pending', 'completed', 'cancelled'] as const;
export const BATCH_STATUSES = ['pending_review', 'accepted', 'rejected'] as const;
export const REDEMPTION_STATUSES = ['pending_pickup', 'fulfilled', 'cancelled'] as const;
export const TRADER_TIERS = ['new', 'returning'] as const;

export const DROPOFF_SLOTS = [
    { value: '10:00', label: '10:00 AM' },
    { value: '12:00', label: '12:00 PM' },
    { value: '14:00', label: '2:00 PM' },
    { value: '16:00', label: '4:00 PM' },
] as const;
export const DROPOFF_SLOT_VALUES = DROPOFF_SLOTS.map((s) => s.value);

export const MAX_PUZZLES_PER_SUBMISSION = 20;
export const MAX_NAME_LENGTH = 120;
export const MIN_PASSWORD_LENGTH = 8;
export const UPLOAD_URL_PREFIX = '/uploads/';

export function pieceLabel(pieces: number): string {
    return pieces >= 2000 ? '2000+' : String(pieces);
}

export function dropoffSlotLabel(value: string): string {
    return DROPOFF_SLOTS.find((s) => s.value === value)?.label ?? value;
}
