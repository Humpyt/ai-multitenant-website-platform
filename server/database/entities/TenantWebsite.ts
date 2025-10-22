import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Tenant } from './Tenant';

export enum WebsiteStatus {
  GENERATING = 'generating',
  COMPLETED = 'completed',
  FAILED = 'failed',
  UPDATING = 'updating'
}

@Entity()
export class TenantWebsite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => Tenant, tenant => tenant.website, { onDelete: 'CASCADE' })
  @JoinColumn()
  tenant: Tenant;

  @Column({
    type: 'enum',
    enum: WebsiteStatus,
    default: WebsiteStatus.GENERATING
  })
  status: WebsiteStatus;

  @Column({ nullable: true })
  htmlUrl: string;

  @Column({ nullable: true })
  cssUrl: string;

  @Column({ nullable: true })
  jsUrl: string;

  @Column('jsonb', { nullable: true })
  metadata: any;

  @Column({ nullable: true })
  errorMessage: string;

  @Column({ nullable: true })
  generatedAt: Date;

  @Column({ nullable: true })
  lastUpdated: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}