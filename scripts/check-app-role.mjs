// Verifies the least-privilege app role against a migrated database.
// Run after `npm run migrate` with APP_DB_PASSWORD set:
//
//   MIGRATION_DATABASE_URL=postgresql://postgres:...@host/db \
//   APP_DATABASE_URL=postgresql://app_rw_login:...@host/db \
//   node scripts/check-app-role.mjs
//
// Local/CI only: it writes (and then deletes) probe rows and a probe table.
import pg from 'pg';

const ownerUrl = process.env.MIGRATION_DATABASE_URL;
const appUrl = process.env.APP_DATABASE_URL;
if (!ownerUrl || !appUrl) {
    console.error('Set MIGRATION_DATABASE_URL (owner) and APP_DATABASE_URL (app_rw_login).');
    process.exit(1);
}

let failures = 0;
function expect(condition, okMsg, badMsg) {
    if (condition) {
        console.log(`  ✓ ${okMsg}`);
    } else {
        console.log(`  ✗ ${badMsg}`);
        failures += 1;
    }
}

async function expectDenied(client, label, sql) {
    await client.query('savepoint probe');
    try {
        await client.query(sql);
        expect(false, '', `${label} should be denied`);
    } catch (err) {
        // 42501 insufficient_privilege (also covers "must be owner of table").
        expect(
            err.code === '42501',
            `${label} denied`,
            `${label} failed with unexpected ${err.code}: ${err.message}`
        );
    }
    await client.query('rollback to savepoint probe');
}

const owner = new pg.Client({ connectionString: ownerUrl });
const app = new pg.Client({ connectionString: appUrl });
await owner.connect();
await app.connect();

try {
    console.log('• role attributes');
    const { rows: me } = await app.query(
        `select current_user as name, rolsuper, rolbypassrls, rolcreatedb, rolcreaterole,
                pg_has_role(current_user, 'app_rw', 'member') as in_app_rw
         from pg_roles where rolname = current_user`
    );
    const r = me[0];
    expect(r.name === 'app_rw_login', 'connected as app_rw_login', `connected as ${r.name}`);
    expect(
        !r.rolsuper && !r.rolbypassrls && !r.rolcreatedb && !r.rolcreaterole,
        'not superuser, no BYPASSRLS/CREATEDB/CREATEROLE',
        `unexpected attributes: ${JSON.stringify(r)}`
    );
    expect(r.in_app_rw, 'member of app_rw', 'not a member of app_rw');

    console.log('• runtime query paths (rolled back)');
    const email = `role-probe-${Date.now()}@example.com`;
    await app.query('begin');
    try {
        const {
            rows: [user],
        } = await app.query(`insert into users (email, password_hash) values ($1, 'x') returning id`, [
            email,
        ]);
        expect(true, 'insert users');
        await app.query('update users set email_verified_at = now() where id = $1', [user.id]);
        expect(true, 'update users');
        await app.query(
            `insert into credit_entries (email, delta, reason) values ($1, 2, 'admin_adjustment')`,
            [email]
        );
        // Values are business logic (tested elsewhere); this only proves the role can run them.
        const {
            rows: [fns],
        } = await app.query(
            `select credit_balance($1) as balance, is_returning_trader($1) as returning,
                    puzzles_added($1) as added, puzzles_taken($1) as taken`,
            [email]
        );
        expect(
            typeof fns.balance === 'number' && typeof fns.returning === 'boolean',
            'credit_balance(), is_returning_trader(), puzzles_added/taken()',
            `helper functions returned ${JSON.stringify(fns)}`
        );
        await app.query('select pg_advisory_xact_lock(hashtext(lower($1)))', [email]);
        expect(true, 'pg_advisory_xact_lock');
        await app.query('select id from users where id = $1 for update', [user.id]);
        await app.query(`select id from puzzles where status = 'available' limit 1 for update`);
        expect(true, 'select ... for update');
        await app.query(
            `insert into waitlist (email, zip, source) values ($1, '12345', 'page')
             on conflict do nothing`,
            [email]
        );
        await app.query('delete from waitlist where email = $1', [email]);
        expect(true, 'insert/delete waitlist');
        await app.query(
            `insert into email_verification_tokens (token_hash, user_id, expires_at)
             values ($1, $2, now() + interval '1 hour')`,
            [`probe-${Date.now()}`, user.id]
        );
        expect(true, 'insert email_verification_tokens');
    } catch (err) {
        expect(false, '', `runtime query failed: ${err.code} ${err.message}`);
    }
    await app.query('rollback');

    console.log('• DDL and owner-only objects');
    await app.query('begin');
    await expectDenied(app, 'create table', 'create table probe_ddl (id int)');
    await expectDenied(app, 'alter table users', 'alter table users add column probe int');
    await expectDenied(app, 'drop table waitlist', 'drop table waitlist');
    await expectDenied(app, 'truncate credit_entries', 'truncate credit_entries');
    await expectDenied(app, 'read schema_migrations', 'select * from schema_migrations');
    await expectDenied(app, 'create role', 'create role probe_role');
    await app.query('rollback');

    console.log('• default privileges cover tables added by later migrations');
    await owner.query('create table if not exists probe_default_privs (id serial primary key, v text)');
    try {
        await app.query(`insert into probe_default_privs (v) values ('x')`);
        const { rowCount } = await app.query('select 1 from probe_default_privs');
        expect(rowCount === 1, 'app can read/write a newly created table', 'new table row not visible');
    } catch (err) {
        expect(false, '', `new table not accessible: ${err.code} ${err.message}`);
    } finally {
        await owner.query('drop table if exists probe_default_privs');
    }
} finally {
    await app.end();
    await owner.end();
}

console.log(failures ? `\n${failures} check(s) failed` : '\nall app-role checks passed');
process.exit(failures ? 1 : 0);
