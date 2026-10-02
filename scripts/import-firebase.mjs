// One-time import of the legacy Firebase inventory (May 2026) into the puzzles table.
//
//   node scripts/import-firebase.mjs                    dry run: pre-flight + plan, writes nothing
//   node scripts/import-firebase.mjs --apply [--limit N] download photos into UPLOAD_DIR, insert rows
//   node scripts/import-firebase.mjs --undo             delete the rows and files this script created
//   node scripts/import-firebase.mjs --seed other.json  alternate input (local failure tests)
//
// Locally: node --env-file=.env.local scripts/import-firebase.mjs ...
// Production: railway ssh --service papaspuzzles -- node scripts/import-firebase.mjs ...
//
// Source of record: db/seed/firebase-donations.json (Firestore `donations` export).
// Each puzzle becomes admin inventory (status available, source admin, no submitter, so no
// credits are minted) with its original created_at. The photo is stored as
// /uploads/firebase-<firestoreId>.<ext>; that marker is what makes re-runs idempotent and
// what --undo keys on. Safe to re-run; do not run two --apply invocations at once.

import { mkdir, readdir, readFile, stat, statfs, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import pg from 'pg';

const MIN_PIECES = 1;
const MAX_PIECES = 50000;
const THEMES = new Set(['Animals', 'Landscape', 'Art', 'Food', 'Cityscape', 'Movies', 'Other']);
const MAX_NAME_LENGTH = 120;
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const FILE_PREFIX = 'firebase-';
const URL_PREFIX = `/uploads/${FILE_PREFIX}`;

const { values: args } = parseArgs({
    options: {
        apply: { type: 'boolean', default: false },
        undo: { type: 'boolean', default: false },
        limit: { type: 'string' },
        seed: { type: 'string' },
    },
});

if (args.apply && args.undo) fail('Pass either --apply or --undo, not both.');
const limit = args.limit === undefined ? Infinity : Number(args.limit);
if (args.limit !== undefined && (!Number.isInteger(limit) || limit < 1))
    fail('--limit must be a positive integer.');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) fail('DATABASE_URL is not set.');
const uploadDir = process.env.UPLOAD_DIR;
if ((args.apply || args.undo) && !uploadDir) {
    fail('UPLOAD_DIR must be set explicitly for --apply/--undo (on Railway: /data/uploads).');
}

function fail(message) {
    console.error(message);
    process.exit(1);
}

// Same rule as src/lib/db.ts and scripts/migrate.mjs.
function sslFor(url) {
    const override = process.env.DATABASE_SSL;
    if (override === 'true') return { rejectUnauthorized: false };
    if (override === 'false') return undefined;
    const host = new URL(url).hostname;
    const isPrivate = host.endsWith('.railway.internal') || host === 'localhost' || host === '127.0.0.1';
    return isPrivate ? undefined : { rejectUnauthorized: false };
}

// ---------------------------------------------------------------------------
// Mapping
// ---------------------------------------------------------------------------

/** Maps one Firestore record to a puzzles row, or explains why it is skipped. */
function mapRecord(doc) {
    const notes = [];
    const name = String(doc.name ?? '').trim();
    if (!name) return { ok: false, reason: 'empty name' };
    if (name.length > MAX_NAME_LENGTH) notes.push(`name truncated from ${name.length} chars`);

    const pieces = Number(String(doc.pieces ?? '').trim());
    if (!Number.isInteger(pieces) || pieces < MIN_PIECES || pieces > MAX_PIECES) {
        return { ok: false, reason: `pieces=${doc.pieces}` };
    }

    const rawTheme = String(doc.theme ?? '')
        .trim()
        .toLowerCase();
    let theme = rawTheme === 'gradient' ? 'Other' : rawTheme.charAt(0).toUpperCase() + rawTheme.slice(1);
    if (!THEMES.has(theme)) {
        notes.push(`theme "${doc.theme}" mapped to Other`);
        theme = 'Other';
    }

    const createdAt = String(doc.created_at ?? '');
    if (Number.isNaN(Date.parse(createdAt)))
        return { ok: false, reason: `bad created_at "${doc.created_at}"` };

    const imageUrl = String(doc.image_url ?? '');
    if (!/^https:\/\//.test(imageUrl)) return { ok: false, reason: 'no image_url' };

    return {
        ok: true,
        row: { id: String(doc.id), name: name.slice(0, MAX_NAME_LENGTH), pieces, theme, createdAt, imageUrl },
        notes,
    };
}

// Mirrors sniffImageType in src/lib/storage.ts (JPEG/PNG only; the source has no other types).
function sniffExtension(buf) {
    if (buf.length < 12) return null;
    if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
    if (buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])))
        return 'png';
    return null;
}

async function download(url) {
    const attempt = async () => {
        const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const buf = Buffer.from(await res.arrayBuffer());
        if (buf.length === 0) throw new Error('empty body');
        if (buf.length > MAX_IMAGE_BYTES) throw new Error(`over ${MAX_IMAGE_BYTES} bytes`);
        return buf;
    };
    try {
        return await attempt();
    } catch (err) {
        if (/HTTP [45]\d\d/.test(err.message)) throw err;
        return attempt();
    }
}

async function headSize(url) {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(15_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return Number(res.headers.get('content-length') ?? 0);
}

// ---------------------------------------------------------------------------
// Reporting helpers
// ---------------------------------------------------------------------------

const fmtBytes = (n) => `${(n / 1024 / 1024).toFixed(1)} MB`;

async function snapshot(client) {
    const byStatus = await client.query(
        'select status, source, count(*)::int as n from puzzles group by 1, 2 order by 1, 2'
    );
    const totals = await client.query(
        `select count(*)::int as total,
                count(*) filter (where image_url like $1)::int as imported
         from puzzles`,
        [`${URL_PREFIX}%`]
    );
    let files = 'UPLOAD_DIR not set';
    if (uploadDir) {
        try {
            const names = await readdir(uploadDir);
            let bytes = 0;
            for (const n of names) bytes += (await stat(path.join(uploadDir, n))).size;
            const imported = names.filter((n) => n.startsWith(FILE_PREFIX)).length;
            const fs = await statfs(uploadDir);
            const free = fmtBytes(Number(fs.bavail) * Number(fs.bsize));
            files = `${names.length} files (${imported} imported), ${fmtBytes(bytes)}, ${free} free`;
        } catch (err) {
            files = `unreadable (${err.code ?? err.message})`;
        }
    }
    console.log(`  puzzles: ${totals.rows[0].total} total, ${totals.rows[0].imported} from this import`);
    for (const r of byStatus.rows) console.log(`    ${r.status}/${r.source}: ${r.n}`);
    console.log(`  uploads (${uploadDir ?? '-'}): ${files}`);
}

function printGroup(title, rows, render) {
    if (!rows.length) return;
    console.log(`\n${title} (${rows.length})`);
    for (const r of rows) console.log(`  ${render(r)}`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

const started = Date.now();
const seedPath = args.seed
    ? path.resolve(args.seed)
    : new URL('../db/seed/firebase-donations.json', import.meta.url);
const docs = JSON.parse(await readFile(seedPath, 'utf8'));
const mode = args.apply ? 'APPLY' : args.undo ? 'UNDO' : 'DRY RUN';
const dbHost = new URL(connectionString).hostname;
console.log(
    `Firebase import: ${mode}  (node ${process.version}, db ${dbHost}, ${docs.length} source records)`
);

const client = new pg.Client({ connectionString, ssl: sslFor(connectionString) });
await client.connect();
let exitCode = 0;

try {
    console.log('\nBefore:');
    await snapshot(client);

    if (args.undo) {
        exitCode = await undo(client);
    } else {
        exitCode = await importAll(client);
    }

    if (args.apply || args.undo) {
        console.log('\nAfter:');
        await snapshot(client);
    }
} finally {
    await client.end();
}
console.log(`\nDone in ${((Date.now() - started) / 1000).toFixed(1)}s`);
process.exit(exitCode);

async function importAll(client) {
    const { rows: existing } = await client.query('select image_url from puzzles where image_url like $1', [
        `${URL_PREFIX}%`,
    ]);
    const done = new Set();
    for (const r of existing) {
        const m = r.image_url.match(/^\/uploads\/firebase-([A-Za-z0-9]+)\./);
        if (m) done.add(m[1]);
    }

    const imported = [];
    const skipped = [];
    const failed = [];
    const warnings = [];
    let bytes = 0;
    let remaining = limit;

    if (args.apply) await mkdir(uploadDir, { recursive: true });

    for (const doc of docs) {
        const mapped = mapRecord(doc);
        if (!mapped.ok) {
            skipped.push({ id: doc.id, name: doc.name, reason: mapped.reason });
            continue;
        }
        const { row, notes } = mapped;
        for (const n of notes) warnings.push(`${row.name}: ${n}`);

        if (done.has(row.id)) {
            skipped.push({ id: row.id, name: row.name, reason: 'already imported' });
            continue;
        }
        if (remaining <= 0) {
            skipped.push({ id: row.id, name: row.name, reason: 'over --limit' });
            continue;
        }

        // A manual duplicate (same name and timestamp, but not from this script) is worth a look.
        const dup = await client.query(
            `select 1 from puzzles where source = 'admin' and name = $1 and created_at = $2::timestamptz
               and image_url not like $3`,
            [row.name, row.createdAt, `${URL_PREFIX}%`]
        );
        if (dup.rowCount)
            warnings.push(`${row.name}: an admin puzzle with the same name and created_at already exists`);

        if (!args.apply) {
            try {
                const size = await headSize(row.imageUrl);
                bytes += size;
                imported.push({ ...row, bytes: size });
            } catch (err) {
                failed.push({ id: row.id, name: row.name, reason: `image unreachable: ${err.message}` });
            }
            remaining--;
            continue;
        }

        let buf;
        try {
            buf = await download(row.imageUrl);
        } catch (err) {
            failed.push({ id: row.id, name: row.name, reason: `download failed: ${err.message}` });
            continue;
        }
        const ext = sniffExtension(buf);
        if (!ext) {
            skipped.push({ id: row.id, name: row.name, reason: 'not a JPEG or PNG' });
            continue;
        }
        const fileName = `${FILE_PREFIX}${row.id}.${ext}`;
        const filePath = path.join(uploadDir, fileName);
        // File first, then row: a committed row never points at a missing file, and a failed
        // insert removes the file so nothing is orphaned.
        await writeFile(filePath, buf);
        try {
            await client.query(
                `insert into puzzles (name, pieces, theme, image_url, status, source, reviewed_at, created_at)
                 values ($1, $2, $3, $4, 'available', 'admin', $5::timestamptz, $5::timestamptz)`,
                [row.name, row.pieces, row.theme, `/uploads/${fileName}`, row.createdAt]
            );
        } catch (err) {
            await unlink(filePath).catch(() => {});
            failed.push({ id: row.id, name: row.name, reason: `insert failed: ${err.message}` });
            continue;
        }
        bytes += buf.length;
        imported.push({ ...row, bytes: buf.length });
        remaining--;
        process.stdout.write('.');
    }
    if (args.apply && imported.length) console.log('');

    const byReason = {};
    for (const s of skipped) (byReason[s.reason.replace(/=.*/, '=…')] ??= []).push(s);

    printGroup(args.apply ? 'Imported' : 'Would import', imported, (r) =>
        [r.id, r.name, r.pieces, r.theme, r.createdAt, `${r.bytes} B`].join(' | ')
    );
    for (const [reason, rows] of Object.entries(byReason)) {
        printGroup(`Skipped: ${reason}`, rows, (r) => `${r.id} | ${r.name} | ${r.reason}`);
    }
    printGroup('Warnings', warnings, (w) => w);
    printGroup('Failed', failed, (r) => `${r.id} | ${r.name} | ${r.reason}`);

    console.log(
        `\nTotals: ${docs.length} source, ${imported.length} ${args.apply ? 'imported' : 'to import'}, ` +
            `${skipped.length} skipped, ${failed.length} failed, ${fmtBytes(bytes)} ${args.apply ? 'written' : 'expected'}`
    );
    return failed.length ? 1 : 0;
}

async function undo(client) {
    const { rows } = await client.query(
        `delete from puzzles
          where image_url like $1 and source = 'admin' and submitted_by_email is null
            and status = 'available'
            and not exists (select 1 from trades t where t.received_puzzle_id = puzzles.id)
            and not exists (select 1 from redemption_puzzles rp where rp.puzzle_id = puzzles.id)
          returning id, name, image_url`,
        [`${URL_PREFIX}%`]
    );
    const kept = await client.query(
        'select name, status from puzzles where image_url like $1 order by name',
        [`${URL_PREFIX}%`]
    );
    let removedFiles = 0;
    for (const r of rows) {
        const name = r.image_url.slice('/uploads/'.length);
        if (!/^[A-Za-z0-9._-]+$/.test(name)) continue;
        try {
            await unlink(path.join(uploadDir, name));
            removedFiles++;
        } catch {
            // Already gone; the row is what matters.
        }
    }
    printGroup('Deleted', rows, (r) => `${r.id} | ${r.name}`);
    printGroup('Kept (no longer plain available inventory)', kept.rows, (r) => `${r.name} | ${r.status}`);
    console.log(
        `\nTotals: ${rows.length} rows deleted, ${removedFiles} files removed, ${kept.rows.length} kept`
    );
    return 0;
}
