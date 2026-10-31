/**
 * One command that brings any database to the current schema — safe to run on
 * every deploy / start (it's idempotent):
 *
 *  1. Existing production DB created with `prisma db push` (tables exist but no
 *     migration history) → mark the baseline `0_init` as already applied.
 *  2. Refuse to apply pending migrations that drop or delete data, unless
 *     ALLOW_DESTRUCTIVE_MIGRATIONS=1 (take a backup first!).
 *  3. `prisma migrate deploy` — applies pending migrations (all additive).
 *  4. Copy legacy menu/dish images into the gallery (MediaAsset) — idempotent.
 *  5. Make sure the business profile row exists.
 *
 *   npm run setup
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (cmd) => execSync(cmd, { cwd: root, stdio: 'inherit', env: process.env });
const log = (msg) => console.log(`[db-setup] ${msg}`);

if (!process.env.DATABASE_URL && !fs.existsSync(path.join(root, '.env'))) {
  console.error('[db-setup] DATABASE_URL is not set — skipping database setup.');
  process.exit(1);
}

// Migrations need a direct connection. When DIRECT_URL isn't set, derive it:
// Supabase pooler transaction port 6543 → session port 5432; otherwise reuse DATABASE_URL.
function loadDotEnvValue(name) {
  const file = path.join(root, '.env');
  if (!fs.existsSync(file)) return undefined;
  const line = fs.readFileSync(file, 'utf8').split('\n').find((l) => l.startsWith(`${name}=`));
  return line?.slice(name.length + 1).trim().replace(/^"|"$/g, '');
}
if (!process.env.DIRECT_URL) {
  const db = process.env.DATABASE_URL ?? loadDotEnvValue('DATABASE_URL') ?? '';
  process.env.DIRECT_URL = db.includes('pooler.supabase.com:6543')
    ? db.replace(':6543/', ':5432/').replace(/[?&]pgbouncer=true/, '').replace(/\?&/, '?')
    : db;
}

run('npx prisma generate > /dev/null');
const { PrismaClient } = await import('@prisma/client');
const prisma = new PrismaClient();

async function tableExists(name) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM information_schema.tables WHERE table_schema = current_schema() AND table_name = $1`, name,
  );
  return rows.length > 0;
}

const DESTRUCTIVE = /\b(DROP\s+(TABLE|COLUMN|SCHEMA)|TRUNCATE|DELETE\s+FROM|ALTER\s+COLUMN\s+\S+\s+(SET\s+DATA\s+)?TYPE)\b/i;

try {
  const hasHistory = await tableExists('_prisma_migrations');
  const hasLegacyTables = await tableExists('User');

  // 1. Baseline an existing DB that predates migrations.
  if (!hasHistory && hasLegacyTables) {
    log('existing database without migration history — marking baseline 0_init as applied');
    run('npx prisma migrate resolve --applied 0_init');
  }

  // 2. Guard against destructive pending migrations.
  const applied = new Set(
    (await tableExists('_prisma_migrations'))
      ? (await prisma.$queryRawUnsafe(`SELECT migration_name FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`)).map((r) => r.migration_name)
      : [],
  );
  const migrationsDir = path.join(root, 'prisma', 'migrations');
  const pending = fs.readdirSync(migrationsDir)
    .filter((d) => fs.existsSync(path.join(migrationsDir, d, 'migration.sql')) && !applied.has(d))
    .sort();
  // A brand-new empty DB legitimately runs the baseline; only check later migrations.
  const risky = pending.filter((d) => d !== '0_init' && DESTRUCTIVE.test(fs.readFileSync(path.join(migrationsDir, d, 'migration.sql'), 'utf8')));
  if (risky.length > 0 && process.env.ALLOW_DESTRUCTIVE_MIGRATIONS !== '1') {
    console.error(`[db-setup] pending migrations would remove data: ${risky.join(', ')}`);
    console.error('[db-setup] back up the database, then re-run with ALLOW_DESTRUCTIVE_MIGRATIONS=1');
    process.exit(1);
  }

  // 3. Apply migrations.
  if (pending.length > 0) log(`applying ${pending.length} migration(s): ${pending.join(', ')}`);
  run('npx prisma migrate deploy');

  // 4. Legacy images → gallery (only when legacy data exists).
  const legacyDishes = await prisma.dish.count();
  if (legacyDishes > 0) {
    log('syncing legacy images into the gallery');
    run('node scripts/backfill-media.mjs --apply');
  }

  // 5. Business profile singleton.
  await prisma.businessProfile.upsert({ where: { id: 'main' }, update: {}, create: { id: 'main' } });

  log('database is ready ✓');
} finally {
  await prisma.$disconnect();
}
