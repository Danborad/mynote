import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { Folder } from '../entities/folder.entity';
import { Note } from '../entities/note.entity';

@Injectable()
export class FoldersService {
    constructor(
        @InjectRepository(Folder)
        private folderRepository: Repository<Folder>,
        @InjectRepository(Note)
        private noteRepository: Repository<Note>,
    ) { }

    async findAll(userId: string) {
        return this.folderRepository.find({
            where: { userId },
            order: { sortOrder: 'ASC', createdAt: 'ASC' },
        });
    }

    async findRootFolders(userId: string) {
        return this.folderRepository.find({
            where: { userId, parentId: IsNull() },
            order: { sortOrder: 'ASC', createdAt: 'ASC' },
        });
    }

    async findChildren(userId: string, parentId: string) {
        return this.folderRepository.find({
            where: { userId, parentId },
            order: { sortOrder: 'ASC', createdAt: 'ASC' },
        });
    }

    async findOne(id: string, userId: string) {
        const folder = await this.folderRepository.findOne({
            where: { id, userId },
        });
        if (!folder) {
            throw new NotFoundException('文件夹不存在');
        }
        return folder;
    }

    async create(userId: string, data: Partial<Folder>) {
        const maxOrderRaw = await this.folderRepository
            .createQueryBuilder('folder')
            .select('MAX(folder.sortOrder)', 'max')
            .where('folder.userId = :userId', { userId })
            .andWhere(data.parentId ? 'folder.parentId = :parentId' : 'folder.parentId IS NULL', data.parentId ? { parentId: data.parentId } : undefined)
            .getRawOne<{ max: string | null }>();

        const nextOrder = data.sortOrder ?? ((Number(maxOrderRaw?.max) || 0) + 1);

        const folder = this.folderRepository.create({
            ...data,
            userId,
            sortOrder: nextOrder,
        });
        return this.folderRepository.save(folder);
    }

    async update(id: string, userId: string, data: Partial<Folder>) {
        const folder = await this.findOne(id, userId);
        Object.assign(folder, data);
        return this.folderRepository.save(folder);
    }

    async delete(id: string, userId: string) {
        const folder = await this.findOne(id, userId);
        await this.noteRepository.update(
            { folderId: id, userId },
            { folderId: null },
        );
        return this.folderRepository.remove(folder);
    }
}
