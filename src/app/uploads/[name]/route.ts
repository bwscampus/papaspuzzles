import { NextResponse } from 'next/server';
import { contentTypeFor, readUpload } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(_request: Request, { params }: { params: Promise<{ name: string }> }) {
    const { name } = await params;
    const file = await readUpload(name);
    if (!file) {
        return new NextResponse('Not found', { status: 404 });
    }

    return new NextResponse(new Uint8Array(file), {
        headers: {
            'Content-Type': contentTypeFor(name),
            'Content-Length': String(file.length),
            'Content-Disposition': 'inline',
            'X-Content-Type-Options': 'nosniff',
            'Cache-Control': 'public, max-age=31536000, immutable',
        },
    });
}
