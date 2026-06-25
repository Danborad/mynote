import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { Folder } from './folder.entity';
import { Note } from './note.entity';

@Entity('users')
export class User {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 50, unique: true })
    username: string;

    @Column({ type: 'varchar', length: 255, unique: true, nullable: true })
    email: string | null;

    @Column({ type: 'varchar', length: 255 })
    password: string;

    @Column({ type: 'varchar', length: 255, nullable: true })
    avatar: string | null;

    @Column({ type: 'boolean', default: false, name: 'is_admin' })
    isAdmin: boolean;

    @Column({ type: 'boolean', default: false, name: 'is_disabled' })
    isDisabled: boolean;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ type: 'timestamp', nullable: true, name: 'last_login_at' })
    lastLoginAt: Date | null;

    @OneToMany(() => Folder, folder => folder.user)
    folders: Folder[];

    @OneToMany(() => Note, note => note.user)
    notes: Note[];

    @Column({ type: 'int', default: 30, name: 'trash_retention_days' })
    trashRetentionDays: number;

    @Column({ type: 'int', default: 30, name: 'share_retention_days' })
    shareRetentionDays: number;

    @Column({ type: 'varchar', length: 10, default: 'one', name: 'web_home_layout' })
    webHomeLayout: string;

    @Column({ type: 'varchar', length: 10, default: 'normal', name: 'web_home_density' })
    webHomeDensity: string;
}
