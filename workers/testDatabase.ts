import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import type { SchemesDatabase } from './api';

export const createTestDatabase = () => {
  const sqlite = new DatabaseSync(':memory:');

  for (const file of readdirSync('migrations').toSorted()) {
    sqlite.exec(readFileSync(`migrations/${file}`, 'utf8'));
  }

  const database: SchemesDatabase = {
    prepare: (query) => ({
      bind: (...values) => {
        const statement = sqlite.prepare(query);
        const params = values as SQLInputValue[];
        return {
          all: async <T>() => ({ results: statement.all(...params) as T[] }),
          first: async <T>() => (statement.get(...params) as T | undefined) ?? null,
          run: async () => ({ meta: { changes: Number(statement.run(...params).changes) } }),
        };
      },
    }),
  };

  return { database, sqlite };
};
