// Applies db/migrations/*.sql in filename order, once each.
// Runs before `next start` on Railway (see railway.json) and via `npm run migrate` locally.
import { readdir, readFile } from 'node:fs/promises';
import pg from 'pg';

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
    console.error('DATABASE_URL is not set.');
    process.exit(1);
}

function sslFor(url) {
    const override = process.env.DATABASE_SSL;
    if (override === 'true') return { rejectUnauthorized: false };
    if (override === 'false') return undefined;
    const host = new URL(url).hostname;
    const isPrivate = host.endsWith('.railway.internal') || host === 'localhost' || host === '127.0.0.1';
    return isPrivate ? undefined : { rejectUnauthorized: false };
}

const dir = new URL('../db/migrations/', import.meta.url);
const files = (await readdir(dir)).filter((f) => f.endsWith('.sql')).sort();

const client = new pg.Client({ connectionString, ssl: sslFor(connectionString) });
await client.connect();

try {
    // Serialize concurrent deploys.
    await client.query('select pg_advisory_lock(727272)');
    await client.query(
        'create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())'
    );

    for (const file of files) {
        const { rowCount } = await client.query('select 1 from schema_migrations where name = $1', [file]);
        if (rowCount) continue;

        const sql = await readFile(new URL(file, dir), 'utf8');
        await client.query('begin');
        try {
            await client.query(sql);
            await client.query('insert into schema_migrations (name) values ($1)', [file]);
            await client.query('commit');
            console.log(`Applied migration ${file}`);
        } catch (err) {
            await client.query('rollback');
            throw err;
        }
    }
    console.log('Migrations up to date.');
} finally {
    await client.end();
}
