import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { TenantWebsite } from './TenantWebsite';

export enum TenantStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  INACTIVE = 'inactive'
}

@Entity()
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  subdomain: string;

  @Column()
  userId: string;

  @Column({
    type: 'enum',
    enum: TenantStatus,
    default: TenantStatus.PENDING
  })
  status: TenantStatus;

  @Column({ nullable: true })
  businessName: string;

  @Column({ nullable: true })
  businessType: string;

  @Column('jsonb', { nullable: true })
  businessData: any;

  @Column({ nullable: true })
  selectedLLM: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => TenantWebsite, website => website.tenant, { cascade: true })
  website: TenantWebsite;
}