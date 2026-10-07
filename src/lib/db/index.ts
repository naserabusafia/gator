import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../../schema.js";
import { readConfig } from "../../config.js";

const config = readConfig();
const conn = postgres(config.dbUrl);

export const db = drizzle(conn, { schema });
export async function closeDb(): Promise<void> {
  await conn.end();
}
