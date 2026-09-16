import type {
    BATCH_STATUSES,
    CONDITIONS,
    PIECES,
    PUZZLE_SOURCES,
    PUZZLE_STATUSES,
    REDEMPTION_STATUSES,
    THEMES,
    TRADE_STATUSES,
    TRADER_TIERS,
} from './constants';

export type Theme = (typeof THEMES)[number];
export type Pieces = (typeof PIECES)[number];
/** 'n/a' is only ever written by admin inventory. */
export type Condition = (typeof CONDITIONS)[number] | 'n/a';
export type PuzzleStatus = (typeof PUZZLE_STATUSES)[number];
export type PuzzleSource = (typeof PUZZLE_SOURCES)[number];
export type TradeStatus = (typeof TRADE_STATUSES)[number];
export type BatchStatus = (typeof BATCH_STATUSES)[number];
export type RedemptionStatus = (typeof REDEMPTION_STATUSES)[number];
export type TraderTier = (typeof TRADER_TIERS)[number];

/** The one puzzle shape used by donate, trade, and admin inventory forms. */
export interface PuzzleInput {
    name: string;
    pieces: Pieces;
    theme: Theme;
    condition: Condition;
    imageUrl: string;
}

export interface User {
    id: string;
    email: string;
    displayName: string | null;
    isAdmin: boolean;
}

export interface TraderStatus {
    /** True once the credit balance is zero or above (everyone starts at -1). */
    returning: boolean;
    /** Puzzles that must be pledged in a trade: max(1, 1 - balance). */
    requiredGiven: number;
    balance: number;
    puzzlesAdded: number;
    puzzlesTaken: number;
}

/** What Explore and the pickers see. Never includes submitter data. */
export interface PublicPuzzle {
    id: string;
    name: string;
    pieces: Pieces;
    theme: Theme;
    condition: Condition;
    imageUrl: string;
}

export interface AdminPuzzle extends PublicPuzzle {
    status: PuzzleStatus;
    source: PuzzleSource;
    donationBatchId: string | null;
    givenInTradeId: string | null;
    submittedByName: string | null;
    submittedByEmail: string | null;
    reviewedAt: string | null;
    createdAt: string;
}

export interface DonationBatchSummary {
    id: string;
    donorName: string;
    donorEmail: string;
    status: BatchStatus;
    puzzleCount: number;
    creditsAwarded: number | null;
    wasFirstBatch: boolean | null;
    reviewedAt: string | null;
    createdAt: string;
}

export interface AdminDonationBatch extends DonationBatchSummary {
    puzzles: AdminPuzzle[];
}

export interface TradeSummary {
    id: string;
    traderName: string;
    traderEmail: string;
    tier: TraderTier;
    received: PublicPuzzle;
    given: Array<PublicPuzzle & { status: PuzzleStatus }>;
    dropoffDate: string;
    dropoffSlot: string;
    status: TradeStatus;
    completedAt: string | null;
    cancelledAt: string | null;
    createdAt: string;
}

export interface RedemptionSummary {
    id: string;
    email: string;
    creditsSpent: number;
    puzzles: PublicPuzzle[];
    status: RedemptionStatus;
    fulfilledAt: string | null;
    cancelledAt: string | null;
    createdAt: string;
}

export type CreditReason =
    | 'donation_accepted'
    | 'puzzle_added'
    | 'puzzle_removed'
    | 'trade_taken'
    | 'trade_cancelled'
    | 'redemption'
    | 'redemption_cancelled'
    | 'admin_adjustment';

export interface CreditEntry {
    id: string;
    email: string;
    delta: number;
    reason: CreditReason;
    donationBatchId: string | null;
    redemptionId: string | null;
    puzzleId: string | null;
    tradeId: string | null;
    note: string | null;
    createdAt: string;
}

export interface AdminUser {
    id: string;
    email: string;
    displayName: string | null;
    createdAt: string;
    creditBalance: number;
    puzzlesAdded: number;
    puzzlesTaken: number;
    completedTrades: number;
    acceptedBatches: number;
    returning: boolean;
    isAdmin: boolean;
}

export interface History {
    stats: TraderStatus;
    trades: TradeSummary[];
    donations: DonationBatchSummary[];
    redemptions: RedemptionSummary[];
}

export type ApiErrorCode =
    'validation' | 'unauthorized' | 'forbidden' | 'not_found' | 'conflict' | 'internal';

export interface ApiErrorBody {
    code: ApiErrorCode;
    message: string;
    field?: string;
}

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiErrorBody };
