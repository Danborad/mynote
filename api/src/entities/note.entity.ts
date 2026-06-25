import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Folder } from './folder.entity';

@Entity('notes')
export class Note {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    title: string;

    @Column({ type: 'text', nullable: true })
    content: string;

    @Column({ type: 'uuid', nullable: true, name: 'folder_id' })
    folderId: string | null;

    @ManyToOne(() => Folder, folder => folder.notes, { nullable: true })
    @JoinColumn({ name: 'folder_id' })
    folder: Folder;

    @Column({ type: 'uuid', name: 'user_id' })
    userId: string;

    @ManyToOne(() => User, user => user.notes)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @Column({ type: 'boolean', default: false, name: 'is_favorite' })
    isFavorite: boolean;

    @Column({ type: 'boolean', default: false, name: 'is_deleted' })
    isDeleted: boolean;

    @Column({ type: 'boolean', default: false, name: 'is_pinned' })
    isPinned: boolean;

    @Column({ type: 'varchar', length: 20, nullable: true })
    color: string | null;

    @Column({ type: 'jsonb', nullable: true })
    attachments: string[];

    @Column({ type: 'int', default: 0, name: 'word_count' })
    wordCount: number;

    @Column({ type: 'varchar', length: 64, nullable: true, unique: true, name: 'share_token' })
    shareToken: string | null;

    @Column({ type: 'timestamp', nullable: true, name: 'shared_at' })
    sharedAt: Date | null;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;

    @Column({ type: 'timestamp', nullable: true, name: 'deleted_at' })
    deletedAt: Date;
}
