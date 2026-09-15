import { handle, ok } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export const GET = handle('auth/me', async () => ok({ user: await getCurrentUser() }));
