import { PUZZLE_STATUS_LABELS } from '@/lib/constants';
import { Badge } from './ui/Badge';

const TONE: Record<string, 'success' | 'warn' | 'danger' | 'neutral' | 'accent' | 'rose'> = {
    pending: 'warn',
    pending_review: 'warn',
    pending_pickup: 'warn',
    available: 'success',
    completed: 'success',
    accepted: 'success',
    fulfilled: 'success',
    reserved: 'accent',
    traded: 'rose',
    claimed: 'rose',
    cancelled: 'danger',
    rejected: 'danger',
};

const LABELS: Record<string, string> = {
    ...PUZZLE_STATUS_LABELS,
    pending: 'Pending',
    pending_pickup: 'Pending pick-up',
    completed: 'Completed',
    accepted: 'Accepted',
    fulfilled: 'Fulfilled',
    cancelled: 'Cancelled',
};

export function StatusBadge({ status }: { status: string }) {
    return <Badge tone={TONE[status] ?? 'neutral'}>{LABELS[status] ?? status.replace(/_/g, ' ')}</Badge>;
}
