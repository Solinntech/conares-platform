import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import type { Client, Project, Quotation } from './mock-data';

type PersistedState = {
  clients: Client[];
  quotations: Quotation[];
  projects: Project[];
};

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly logger = new Logger(DatabaseService.name);
  private readonly pool?: Pool;

  constructor() {
    const connectionString = process.env.DATABASE_URL?.trim();

    if (!connectionString) {
      return;
    }

    this.pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });
  }

  isEnabled() {
    return Boolean(this.pool);
  }

  async initialize() {
    if (!this.pool) {
      this.logger.warn('DATABASE_URL no definido. Se usara almacenamiento en memoria.');
      return;
    }

    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS app_state (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
  }

  async loadState(): Promise<PersistedState | null> {
    if (!this.pool) {
      return null;
    }

    const result = await this.pool.query<{
      key: 'clients' | 'quotations' | 'projects';
      value: Client[] | Quotation[] | Project[];
    }>('SELECT key, value FROM app_state WHERE key IN ($1, $2, $3)', ['clients', 'quotations', 'projects']);

    if (result.rowCount === 0) {
      return null;
    }

    const stateMap = new Map(result.rows.map((row) => [row.key, row.value]));

    return {
      clients: (stateMap.get('clients') as Client[]) ?? [],
      quotations: (stateMap.get('quotations') as Quotation[]) ?? [],
      projects: (stateMap.get('projects') as Project[]) ?? [],
    };
  }

  async saveState(state: PersistedState) {
    if (!this.pool) {
      return;
    }

    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      await client.query(
        `
          INSERT INTO app_state(key, value, updated_at)
          VALUES ($1, $2::jsonb, NOW())
          ON CONFLICT (key)
          DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `,
        ['clients', JSON.stringify(state.clients)],
      );

      await client.query(
        `
          INSERT INTO app_state(key, value, updated_at)
          VALUES ($1, $2::jsonb, NOW())
          ON CONFLICT (key)
          DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `,
        ['quotations', JSON.stringify(state.quotations)],
      );

      await client.query(
        `
          INSERT INTO app_state(key, value, updated_at)
          VALUES ($1, $2::jsonb, NOW())
          ON CONFLICT (key)
          DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `,
        ['projects', JSON.stringify(state.projects)],
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }
}
