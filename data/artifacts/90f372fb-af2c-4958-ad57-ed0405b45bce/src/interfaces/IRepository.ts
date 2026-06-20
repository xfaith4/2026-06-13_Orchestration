/**
 * Base Repository Interface
 * 
 * Defines the contract for all repository implementations.
 * Provides standard CRUD operations and transaction management.
 */

export interface IRepository<T, TId = string> {
  /**
   * Create a new entity
   * @param entity The entity to create
   * @returns The created entity with assigned ID
   * @throws RepositoryError if creation fails
   */
  create(entity: T): Promise<T>;

  /**
   * Read an entity by ID
   * @param id The entity identifier
   * @returns The entity or null if not found
   * @throws RepositoryError if read operation fails
   */
  read(id: TId): Promise<T | null>;

  /**
   * Update an existing entity
   * @param id The entity identifier
   * @param updates Partial updates to apply
   * @returns The updated entity
   * @throws RepositoryError if entity not found or update fails
   */
  update(id: TId, updates: Partial<T>): Promise<T>;

  /**
   * Delete an entity by ID
   * @param id The entity identifier
   * @returns True if deletion was successful
   * @throws RepositoryError if deletion fails
   */
  delete(id: TId): Promise<boolean>;

  /**
   * List entities with optional filtering and pagination
   * @param filter Optional filter criteria
   * @param options Pagination and sorting options
   * @returns List of entities and total count
   * @throws RepositoryError if list operation fails
   */
  list(
    filter?: Partial<T>,
    options?: ListOptions
  ): Promise<PagedResult<T>>;

  /**
   * Check if an entity exists
   * @param id The entity identifier
   * @returns True if entity exists
   */
  exists(id: TId): Promise<boolean>;

  /**
   * Get count of entities matching filter
   * @param filter Optional filter criteria
   * @returns Number of matching entities
   */
  count(filter?: Partial<T>): Promise<number>;

  /**
   * Begin a transaction for atomic operations
   * @returns Transaction context
   */
  beginTransaction(): Promise<ITransaction>;
}

/**
 * List/Query Options Interface
 */
export interface ListOptions {
  /** Zero-based page number */
  page?: number;
  /** Items per page */
  pageSize?: number;
  /** Sort field */
  sortBy?: string;
  /** Sort direction */
  sortDirection?: 'asc' | 'desc';
  /** Custom filter options */
  [key: string]: unknown;
}

/**
 * Paged result wrapper
 */
export interface PagedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * Transaction Interface
 * Enables atomic operations across multiple repository calls
 */
export interface ITransaction {
  /** Unique transaction identifier */
  id: string;

  /** Transaction start time */
  startedAt: Date;

  /**
   * Commit the transaction
   * @throws TransactionError if commit fails
   */
  commit(): Promise<void>;

  /**
   * Rollback the transaction
   * @throws TransactionError if rollback fails
   */
  rollback(): Promise<void>;

  /**
   * Check if transaction is active
   */
  isActive(): boolean;

  /**
   * Add savepoint for partial rollback
   * @param name Savepoint identifier
   */
  createSavepoint(name: string): Promise<void>;

  /**
   * Rollback to savepoint
   * @param name Savepoint identifier
   */
  rollbackToSavepoint(name: string): Promise<void>;
}

/**
 * Repository Error
 */
export class RepositoryError extends Error {
  constructor(
    public code: string,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'RepositoryError';
  }
}

/**
 * Transaction Error
 */
export class TransactionError extends Error {
  constructor(
    public code: string,
    message: string,
    public transactionId?: string
  ) {
    super(message);
    this.name = 'TransactionError';
  }
}
