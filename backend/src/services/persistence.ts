import fs from 'fs/promises';
import path from 'path';
import { v4 as uuid } from 'uuid';

export interface PersistenceConfig {
  dataDir: string;
}

export class PersistenceService {
  private dataDir: string;

  constructor(config: PersistenceConfig) {
    this.dataDir = config.dataDir;
  }

  private getCollectionPath(collection: string): string {
    return path.join(this.dataDir, collection);
  }

  private getEntityPath(collection: string, id: string): string {
    return path.join(this.getCollectionPath(collection), `${id}.json`);
  }

  private getIndexPath(collection: string): string {
    return path.join(this.getCollectionPath(collection), 'index.json');
  }

  async ensureCollection(collection: string): Promise<void> {
    const collectionPath = this.getCollectionPath(collection);
    try {
      await fs.mkdir(collectionPath, { recursive: true });
      const indexPath = this.getIndexPath(collection);
      try {
        await fs.access(indexPath);
      } catch {
        await fs.writeFile(indexPath, JSON.stringify({ ids: [], count: 0 }, null, 2));
      }
    } catch (err) {
      console.error(`Error ensuring collection ${collection}:`, err);
      throw err;
    }
  }

  async create<T extends { id?: string; createdAt?: string; updatedAt?: string }>(
    collection: string,
    data: Partial<T>
  ): Promise<T> {
    await this.ensureCollection(collection);
    
    const id = data.id || uuid();
    const now = new Date().toISOString();
    const entity: T = {
      ...data,
      id,
      createdAt: data.createdAt || now,
      updatedAt: data.updatedAt || now,
    } as T;

    const entityPath = this.getEntityPath(collection, id);
    await fs.writeFile(entityPath, JSON.stringify(entity, null, 2));

    const index = await this.readIndex(collection);
    if (!index.ids.includes(id)) {
      index.ids.push(id);
      index.count = index.ids.length;
      await this.writeIndex(collection, index);
    }

    return entity;
  }

  async read<T>(collection: string, id: string): Promise<T | null> {
    try {
      const entityPath = this.getEntityPath(collection, id);
      const data = await fs.readFile(entityPath, 'utf-8');
      return JSON.parse(data) as T;
    } catch {
      return null;
    }
  }

  async list<T>(collection: string): Promise<T[]> {
    await this.ensureCollection(collection);
    
    try {
      const index = await this.readIndex(collection);
      const entities: T[] = [];

      for (const id of index.ids) {
        const entity = await this.read<T>(collection, id);
        if (entity) {
          entities.push(entity);
        }
      }

      return entities;
    } catch {
      return [];
    }
  }

  async update<T extends { id: string; updatedAt?: string }>(
    collection: string,
    id: string,
    data: Partial<T>
  ): Promise<T | null> {
    const existing = await this.read<T>(collection, id);
    if (!existing) {
      return null;
    }

    const now = new Date().toISOString();
    const updated: T = {
      ...existing,
      ...data,
      id,
      updatedAt: now,
    };

    const entityPath = this.getEntityPath(collection, id);
    await fs.writeFile(entityPath, JSON.stringify(updated, null, 2));

    return updated;
  }

  async delete(collection: string, id: string): Promise<boolean> {
    try {
      const entityPath = this.getEntityPath(collection, id);
      await fs.unlink(entityPath);

      const index = await this.readIndex(collection);
      index.ids = index.ids.filter(i => i !== id);
      index.count = index.ids.length;
      await this.writeIndex(collection, index);

      return true;
    } catch {
      return false;
    }
  }

  private async readIndex(collection: string): Promise<{ ids: string[]; count: number }> {
    try {
      const indexPath = this.getIndexPath(collection);
      const data = await fs.readFile(indexPath, 'utf-8');
      return JSON.parse(data);
    } catch {
      return { ids: [], count: 0 };
    }
  }

  private async writeIndex(
    collection: string,
    index: { ids: string[]; count: number }
  ): Promise<void> {
    const indexPath = this.getIndexPath(collection);
    await fs.writeFile(indexPath, JSON.stringify(index, null, 2));
  }
}
