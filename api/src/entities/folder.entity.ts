import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from './user.entity';
import { Note } from './note.entity';

@Entity('folders')
export class Folder {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 100 })
    name: string;

    @Column({ type: 'uuid', nullable: true, name: 'parent_id' })
    parentId: string;

    @ManyToOne(() => Folder, folder => folder.children, { nullable: true })
    @JoinColumn({ name: 'parent_id' })
    parent: Folder;

    @OneToMany(() => Folder, folder => folder.parent)
    children: Folder[];

    @Column({ type: 'uuid', name: 'user_id' })
    userId: string;

    @Column({ type: 'int', name: 'sort_order', default: 0 })
    sortOrder: number;

    @ManyToOne(() => User, user => user.folders)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @OneToMany(() => Note, note => note.folder)
    notes: Note[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
