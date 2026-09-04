import { describe, expect, it } from 'vitest';
import { safeFileName, sniffImageType } from './storage';

describe('sniffImageType', () => {
    const pad = (bytes: number[]) => Buffer.from([...bytes, ...Array(16).fill(0)]);

    it('detects common formats from magic bytes', () => {
        expect(sniffImageType(pad([0xff, 0xd8, 0xff, 0xe0]))).toBe('image/jpeg');
        expect(sniffImageType(pad([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))).toBe('image/png');
        expect(sniffImageType(Buffer.from('GIF89a' + '\0'.repeat(10)))).toBe('image/gif');
        expect(sniffImageType(Buffer.from('RIFF\0\0\0\0WEBPVP8 '))).toBe('image/webp');
        expect(sniffImageType(Buffer.from('\0\0\0\x18ftypheic\0\0\0\0'))).toBe('image/heic');
    });

    it('rejects anything else, including HTML with an image extension', () => {
        expect(sniffImageType(Buffer.from('<html><script>alert(1)</script></html>'))).toBeNull();
        expect(sniffImageType(Buffer.from('short'))).toBeNull();
    });
});

describe('safeFileName', () => {
    it('strips paths and unsafe characters', () => {
        expect(safeFileName('../../etc/passwd')).toBe('passwd');
        expect(safeFileName('my photo (1).JPG')).toBe('my_photo__1_.JPG');
        expect(safeFileName('')).toBe('upload');
    });
});
