import { Injectable, NotFoundException, OnModuleInit, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { Note } from '../entities/note.entity';
import { User } from '../entities/user.entity';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

@Injectable()
export class NotesService implements OnModuleInit {
    private readonly logger = new Logger(NotesService.name);

    private extractAttachmentPathsFromNotes(notes: Array<Pick<Note, 'content'>>): string[] {
        const fileSet = new Set<string>();
        for (const note of notes) {
            const content = String(note.content || '');
            const matches = content.match(/\/uploads\/attachments\/[\w.-]+/g) || [];
            matches.forEach((match) => fileSet.add(path.join('/app', match)));
        }
        return Array.from(fileSet);
    }

    private async deleteAttachmentFilesForNotes(notes: Array<Pick<Note, 'content'>>) {
        const physicalPaths = this.extractAttachmentPathsFromNotes(notes);
        for (const physicalPath of physicalPaths) {
            try {
                if (fs.existsSync(physicalPath)) {
                    fs.unlinkSync(physicalPath);
                }
            } catch (e) {
                this.logger.warn(`删除附件失败: ${physicalPath}`);
            }
        }
    }

    private calcShareExpiresAt(sharedAt: Date | null, retentionDays: number | null | undefined) {
        if (!sharedAt) return null;
        const days = retentionDays && retentionDays > 0 ? retentionDays : 30;
        const expiresAt = new Date(sharedAt);
        expiresAt.setDate(expiresAt.getDate() + days);
        return expiresAt;
    }

    onModuleInit() {
        // 启动时执行一次清理
        this.autoCleanTrash();
        // 每小时自动清理一次
        setInterval(() => this.autoCleanTrash(), 60 * 60 * 1000);
    }

    async autoCleanTrash() {
        try {
            const users = await this.userRepository.find();
            for (const user of users) {
                const retentionDays = user.trashRetentionDays || 30;
                const cutoff = new Date();
                cutoff.setDate(cutoff.getDate() - retentionDays);

                const expiredNotes = await this.noteRepository
                    .createQueryBuilder('note')
                    .where('note.user_id = :userId', { userId: user.id })
                    .andWhere('note.is_deleted = true')
                    .andWhere('(note.deleted_at IS NOT NULL AND note.deleted_at < :cutoff)', { cutoff })
                    .getMany();

                if (expiredNotes.length > 0) {
                    await this.deleteAttachmentFilesForNotes(expiredNotes);
                    await this.noteRepository.remove(expiredNotes);
                    this.logger.log(`自动清理用户 ${user.username} 的 ${expiredNotes.length} 条过期笔记`);
                }
            }
        } catch (error) {
            this.logger.error('自动清理废纸篓失败', error);
        }
    }
    constructor(
        @InjectRepository(Note)
        private noteRepository: Repository<Note>,
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }

    async calculateUserStorage(userId: string): Promise<number> {
        // 查找该用户的所有笔记（包括废纸篓中的）
        const notes = await this.noteRepository.find({
            where: { userId },
            select: ['content'] // 只查询内容字段优化性能
        });

        let totalSize = 0;
        const processedFiles = new Set<string>(); // 防止同一文件被重复计算

        for (const note of notes) {
            if (!note.content) continue;

            // 正则匹配内容中的附件链接
            // 匹配格式: /uploads/attachments/filename.ext
            const matches = note.content.match(/\/uploads\/attachments\/[\w.-]+/g) || [];

            for (const match of matches) {
                // 将 URL 路径转换为服务器物理路径
                // URL: /uploads/attachments/file.png
                // Docker Path: /app/uploads/attachments/file.png
                // 注意：match 已经包含 /uploads/attachments/...
                // 我们只需要去掉开头的 /uploads 如果映射不同，但在 Docker 里 /app/uploads 是挂载点
                // 简单处理：直接映射到 /app + match
                const physicalPath = path.join('/app', match);

                if (processedFiles.has(physicalPath)) continue;
                processedFiles.add(physicalPath);

                try {
                    if (fs.existsSync(physicalPath)) {
                        const stats = fs.statSync(physicalPath);
                        totalSize += stats.size;
                    }
                } catch (e) {
                    console.error(`Error calculating size for ${physicalPath}:`, e);
                }
            }
        }

        return totalSize;
    }

    async findAll(userId: string, folderId?: string) {
        const where: any = { userId, isDeleted: false };
        if (folderId) {
            where.folderId = folderId;
        }
        return this.noteRepository.find({
            where,
            order: { isPinned: 'DESC', updatedAt: 'DESC' },
        });
    }

    async findOne(id: string, userId: string) {
        const note = await this.noteRepository.findOne({
            where: { id, userId, isDeleted: false },
        });
        if (!note) {
            throw new NotFoundException('笔记不存在');
        }
        return note;
    }

    async create(userId: string, data: Partial<Note>) {
        const wordCount = data.content ? data.content.length : 0;
        const note = this.noteRepository.create({
            ...data,
            userId,
            wordCount,
        });
        return this.noteRepository.save(note);
    }

    async update(id: string, userId: string, data: Partial<Note>) {
        const note = await this.findOne(id, userId);
        if (data.content) {
            data.wordCount = data.content.length;
        }
        Object.assign(note, data);
        return this.noteRepository.save(note);
    }

    async delete(id: string, userId: string) {
        const note = await this.findOne(id, userId);
        note.isDeleted = true;
        note.deletedAt = new Date();
        return this.noteRepository.save(note);
    }

    async toggleFavorite(id: string, userId: string) {
        const note = await this.findOne(id, userId);
        note.isFavorite = !note.isFavorite;
        return this.noteRepository.save(note);
    }

    async togglePin(id: string, userId: string) {
        const note = await this.findOne(id, userId);
        note.isPinned = !note.isPinned;
        return this.noteRepository.save(note);
    }

    async setColor(id: string, userId: string, color: string) {
        const note = await this.findOne(id, userId);
        await this.noteRepository.update({ id, userId }, { color: color || null });
        return {
            ...note,
            color: color || null,
        };
    }

    async findFavorites(userId: string) {
        return this.noteRepository.find({
            where: { userId, isFavorite: true, isDeleted: false },
            order: { isPinned: 'DESC', updatedAt: 'DESC' },
        });
    }

    async findDeleted(userId: string) {
        return this.noteRepository.find({
            where: { userId, isDeleted: true },
            order: { updatedAt: 'DESC' },
        });
    }

    async restore(id: string, userId: string) {
        const note = await this.noteRepository.findOne({
            where: { id, userId, isDeleted: true },
        });
        if (!note) {
            throw new NotFoundException('笔记不存在');
        }
        note.isDeleted = false;
        note.deletedAt = null as any;
        return this.noteRepository.save(note);
    }

    async permanentDelete(id: string, userId: string) {
        const note = await this.noteRepository.findOne({
            where: { id, userId, isDeleted: true },
        });
        if (!note) {
            throw new NotFoundException('笔记不存在');
        }
        await this.deleteAttachmentFilesForNotes([note]);
        await this.noteRepository.remove(note);
        return { success: true };
    }

    async emptyTrash(userId: string) {
        const notes = await this.noteRepository.find({
            where: { userId, isDeleted: true },
        });

        if (notes.length > 0) {
            await this.deleteAttachmentFilesForNotes(notes);
            await this.noteRepository.remove(notes);
        }

        return { success: true, count: notes.length };
    }

    async search(userId: string, query: string) {
        if (!query || !query.trim()) return [];
        const q = `%${query.trim()}%`;
        return this.noteRepository
            .createQueryBuilder('note')
            .where('note.user_id = :userId', { userId })
            .andWhere('note.is_deleted = false')
            .andWhere('(note.title ILIKE :q OR note.content ILIKE :q)', { q })
            .orderBy('note.updated_at', 'DESC')
            .limit(20)
            .getMany();
    }

    async getStats(userId: string) {
        const [totalNotes, favoritesCount, pinnedCount, trashCount, wordCountResult] = await Promise.all([
            this.noteRepository.count({ where: { userId, isDeleted: false } }),
            this.noteRepository.count({ where: { userId, isFavorite: true, isDeleted: false } }),
            this.noteRepository.count({ where: { userId, isPinned: true, isDeleted: false } }),
            this.noteRepository.count({ where: { userId, isDeleted: true } }),
            this.noteRepository
                .createQueryBuilder('note')
                .select('SUM(note.word_count)', 'total')
                .where('note.user_id = :userId', { userId })
                .andWhere('note.is_deleted = false')
                .getRawOne(),
        ]);

        const storageUsed = await this.calculateUserStorage(userId);

        return {
            totalNotes,
            favoritesCount,
            pinnedCount,
            trashCount,
            totalWordCount: parseInt(wordCountResult?.total ?? '0', 10),
            storageUsed,
        };
    }

    async createShareLink(id: string, userId: string, origin: string) {
        const note = await this.findOne(id, userId);
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!note.shareToken) {
            note.shareToken = randomUUID().replace(/-/g, '');
        }
        note.sharedAt = new Date();

        const saved = await this.noteRepository.save(note);
        const base = origin.replace(/\/$/, '');

        return {
            shareToken: saved.shareToken,
            shareUrl: `${base}/share/${saved.shareToken}`,
            sharedAt: saved.sharedAt,
            expiresAt: this.calcShareExpiresAt(saved.sharedAt, user?.shareRetentionDays),
            enabled: true,
        };
    }

    async getShareInfo(id: string, userId: string, origin: string) {
        const note = await this.findOne(id, userId);
        const user = await this.userRepository.findOne({ where: { id: userId } });
        const base = origin.replace(/\/$/, '');

        return {
            enabled: !!note.shareToken,
            shareToken: note.shareToken || null,
            shareUrl: note.shareToken ? `${base}/share/${note.shareToken}` : null,
            sharedAt: note.sharedAt || null,
            expiresAt: this.calcShareExpiresAt(note.sharedAt, user?.shareRetentionDays),
        };
    }

    async listSharedLinks(userId: string, origin: string) {
        const base = origin.replace(/\/$/, '');
        const user = await this.userRepository.findOne({ where: { id: userId } });
        const retentionDays = user?.shareRetentionDays || 30;

        const notes = await this.noteRepository.find({
            where: { userId, isDeleted: false },
            select: ['id', 'title', 'content', 'shareToken', 'sharedAt', 'updatedAt'],
            order: { sharedAt: 'DESC' },
        });

        return notes
            .filter(note => !!note.shareToken)
            .map(note => {
                const expiresAt = this.calcShareExpiresAt(note.sharedAt, retentionDays);
                return {
                    id: note.id,
                    title: note.title || '无标题笔记',
                    content: note.content,
                    sharedAt: note.sharedAt,
                    updatedAt: note.updatedAt,
                    shareToken: note.shareToken,
                    shareUrl: `${base}/share/${note.shareToken}`,
                    expiresAt,
                    expired: !!(expiresAt && expiresAt.getTime() < Date.now()),
                };
            });
    }

    async revokeShareLink(id: string, userId: string) {
        const note = await this.findOne(id, userId);
        note.shareToken = null;
        note.sharedAt = null;
        await this.noteRepository.save(note);
        return { enabled: false };
    }

    async findSharedByToken(token: string) {
        const note = await this.noteRepository.findOne({
            where: { shareToken: token, isDeleted: false },
            relations: ['user'],
            select: {
                id: true,
                title: true,
                content: true,
                createdAt: true,
                updatedAt: true,
                sharedAt: true,
                user: {
                    shareRetentionDays: true,
                },
            },
        });

        if (!note) {
            throw new NotFoundException('分享内容不存在或已失效');
        }

        const expiresAt = this.calcShareExpiresAt(note.sharedAt, note.user?.shareRetentionDays);
        if (expiresAt && expiresAt.getTime() < Date.now()) {
            throw new NotFoundException('分享内容不存在或已失效');
        }

        return {
            id: note.id,
            title: note.title,
            content: note.content,
            createdAt: note.createdAt,
            updatedAt: note.updatedAt,
            sharedAt: note.sharedAt,
            expiresAt,
        };
    }
}
