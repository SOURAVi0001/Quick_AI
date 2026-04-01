import { neon } from '@neondatabase/serverless';

let sql;

export function getDB() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL not set');
  }

  if (!sql) {
    sql = neon(process.env.DATABASE_URL);
  }

  return sql;
}

export default (strings, ...values) => getDB()(strings, ...values);
