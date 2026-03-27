import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class UserOrmEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'firebase_uid', type: 'varchar', unique: true })
  firebaseUid: string;

  @Column({ type: 'varchar' })
  email: string;

  @Column({ name: 'first_name', type: 'varchar', nullable: true })
  firstName: string | null;

  @Column({ name: 'last_name', type: 'varchar', nullable: true })
  lastName: string | null;

  @Column({ name: 'avatar_url', type: 'varchar', nullable: true })
  avatarUrl: string | null;

  @Column({ name: 'location_label', type: 'varchar', nullable: true })
  locationLabel: string | null;

  @Column({
    name: 'location_latitude',
    type: 'double precision',
    nullable: true,
  })
  locationLatitude: number | null;

  @Column({
    name: 'location_longitude',
    type: 'double precision',
    nullable: true,
  })
  locationLongitude: number | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date;
}
