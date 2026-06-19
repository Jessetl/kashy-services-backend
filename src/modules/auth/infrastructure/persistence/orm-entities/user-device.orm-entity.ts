import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { UserOrmEntity } from './user.orm-entity';

@Entity('user_devices')
export class UserDeviceOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'device_id', type: 'varchar', unique: true })
  deviceId!: string;

  @Column({ name: 'device_name', type: 'varchar' })
  deviceName!: string;

  @Column({ name: 'firebase_fcm_token', type: 'varchar', nullable: true })
  fcmToken!: string | null;

  @Column({ name: 'platform', type: 'varchar' })
  platform!: string;

  @Column({ name: 'app_version', type: 'varchar', nullable: true })
  appVersion!: string | null;

  @Column({ name: 'last_active_at', type: 'timestamptz' })
  lastActiveAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => UserOrmEntity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: UserOrmEntity;
}
