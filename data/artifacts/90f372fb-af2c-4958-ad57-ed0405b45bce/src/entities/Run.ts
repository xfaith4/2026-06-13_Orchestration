import 'reflect-metadata';
import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('runs')
export class Run {
  @PrimaryColumn()
  id!: string;

  @Column()
  name!: string;

  @Column({ nullable: true })
  description?: string;

  @Column()
  planId!: string;

  @Column()
  roadmapId!: string;

  @Column({ default: 'PENDING' })
  status!: string;

  @Column({ type: 'simple-json', nullable: true })
  runConfig?: Record<string, unknown>;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
