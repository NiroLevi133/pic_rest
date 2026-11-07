import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./db', () => ({ db: {} }));
const { SHOP_SCHEMA_SQL } = await import('./schema');

const normalize = (sql: string) => sql.replace(/--.*$/gm, '').replace(/\s+/g, ' ').replace(/\s*([(),;])\s*/g, '$1').trim();

describe('shop schema', () => {
  it('matches the migration exactly, and is idempotent', () => {
    const migration = readFileSync(path.join(__dirname, '../../../prisma/migrations/20261107120000_shop/migration.sql'), 'utf8');
    const statements = normalize(migration).split(';').filter(Boolean);
    expect(statements).toEqual(SHOP_SCHEMA_SQL.map(normalize));
    for (const s of statements) expect(s).toMatch(/IF NOT EXISTS/);
  });
});
