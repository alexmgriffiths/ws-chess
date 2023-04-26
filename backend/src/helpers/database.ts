import { createPool, Pool, PoolConnection } from "mysql2/promise";
import dotenv from "dotenv";

dotenv.config();

export class DatabaseHelper {
  private pool: Pool;

  constructor() {
    this.pool = createPool({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASS,
      database: process.env.DB_NAME,
    });
  }

  async query(sql: string, values: any[] = []): Promise<any[]> {
    const connection: PoolConnection = await this.pool.getConnection();
    try {
      const [rows] = await connection.execute(sql, values);
      return rows as any[];
    } finally {
      connection.release();
    }
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
