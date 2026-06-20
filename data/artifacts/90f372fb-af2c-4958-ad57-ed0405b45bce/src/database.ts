import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Plan } from './entities/Plan';
import { Roadmap } from './entities/Roadmap';
import { Run } from './entities/Run';

export const AppDataSource = new DataSource({
  type: 'better-sqlite3',
  database: process.env.DB_PATH || 'data/app.db',
  entities: [Plan, Roadmap, Run],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
});

export async function initializeDatabase(): Promise<void> {
  if (!AppDataSource.isInitialized) {
    await AppDataSource.initialize();
  }
}
