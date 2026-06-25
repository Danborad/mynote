import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Folder } from '../entities/folder.entity';
import { Note } from '../entities/note.entity';
import { SystemSettingsService } from '../system-settings/system-settings.service';
import * as bcrypt from 'bcrypt';
import { NotesService } from '../notes/notes.service';
import * as archiver from 'archiver';
import { existsSync } from 'fs';
import { join } from 'path';

@Injectable()
export class AdminService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Folder)
        private folderRepository: Repository<Folder>,
        @InjectRepository(Note)
        private noteRepository: Repository<Note>,
        private systemSettingsService: SystemSettingsService,
        private notesService: NotesService,
    ) { }

    async getAdminSettings() {
        return {
            allowRegistration: await this.systemSettingsService.getAllowRegistration(),
        };
    }

    async getOverview() {
        const users = await this.userRepository.find({ order: { createdAt: 'DESC' } })
        const nonAdminUsers = users.filter((user) => !user.isAdmin)
        const notes = await this.noteRepository.find()

        const totalUsers = nonAdminUsers.length
        const totalNotes = notes.filter((note) => !note.isDeleted && nonAdminUsers.some((user) => user.id === note.userId)).length
        const totalStorageUsedBytes = (await Promise.all(nonAdminUsers.map((user) => this.notesService.calculateUserStorage(user.id)))).reduce((sum, value) => sum + value, 0)

        return {
            totalUsers,
            totalNotes,
            totalStorageUsedBytes,
            allowRegistration: await this.systemSettingsService.getAllowRegistration(),
        }
    }

    async updateRegistrationSetting(allowRegistration: boolean) {
        return {
            allowRegistration: await this.systemSettingsService.setAllowRegistration(allowRegistration),
        };
    }

    async exportInstanceBackup() {
        const users = await this.userRepository.find();
        const folders = await this.folderRepository.find();
        const notes = await this.noteRepository.find();
        const settings = await this.getAdminSettings();
        const exportedAt = new Date().toISOString();

        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.append(JSON.stringify({
            version: 1,
            exportedAt,
            counts: {
                users: users.length,
                folders: folders.length,
                notes: notes.length,
            },
        }, null, 2), { name: 'manifest.json' });
        archive.append(JSON.stringify(settings, null, 2), { name: 'settings.json' });
        archive.append(JSON.stringify({ users, folders, notes }, null, 2), { name: 'database.json' });

        const activeNotes = notes.filter((note) => !note.isDeleted);
        const attachmentMatches = new Set<string>();
        activeNotes.forEach((note) => {
            const matches = String(note.content || '').match(/\/uploads\/attachments\/[\w.-]+/g) || [];
            matches.forEach((match) => attachmentMatches.add(match.replace('/uploads/attachments/', '')));
        });

        const attachmentsDir = join(process.cwd(), 'uploads', 'attachments');
        const avatarsDir = join(process.cwd(), 'uploads', 'avatars');
        if (existsSync(attachmentsDir)) {
            attachmentMatches.forEach((filename) => {
                const physicalPath = join(attachmentsDir, filename);
                if (existsSync(physicalPath)) {
                    archive.file(physicalPath, { name: `uploads/attachments/${filename}` });
                }
            });
        }
        if (existsSync(avatarsDir)) {
            users.forEach((user) => {
                if (!user.avatar) return;
                const filename = user.avatar.split('/').pop();
                if (!filename) return;
                const physicalPath = join(avatarsDir, filename);
                if (existsSync(physicalPath)) {
                    archive.file(physicalPath, { name: `uploads/avatars/${filename}` });
                }
            });
        }

        return {
            archive,
            filename: `mynote-backup-${Date.now()}.zip`,
        };
    }

    async validateInstanceBackupImport(_payload: any) {
        return {
            valid: true,
            mode: 'validate-only',
        };
    }

    async executeInstanceBackupImport(_payload: any) {
        return {
            success: true,
            mode: 'execute',
        };
    }

    async listUsers() {
        const users = await this.userRepository.find({ order: { createdAt: 'DESC' } })
        const notes = await this.noteRepository.find()
        const folders = await this.folderRepository.find()

        const nonAdminUsers = users.filter((user) => !user.isAdmin)
        return Promise.all(nonAdminUsers.map(async (user) => ({
            id: user.id,
            username: user.username,
            email: user.email,
            avatar: user.avatar,
            isAdmin: user.isAdmin,
            isDisabled: user.isDisabled,
            createdAt: user.createdAt,
            lastLoginAt: user.lastLoginAt,
            noteCount: notes.filter((note) => note.userId === user.id).length,
            folderCount: folders.filter((folder) => folder.userId === user.id).length,
            storageUsedBytes: await this.notesService.calculateUserStorage(user.id),
        })))
    }

    async createUser(username: string, password: string, email: string | null = null) {
        const existingUser = await this.userRepository.findOne({ where: [{ username }, ...(email ? [{ email }] : [])] })
        if (existingUser) {
            throw new Error('用户名或邮箱已存在')
        }

        const hashedPassword = await bcrypt.hash(password, 10)
        const user = await this.userRepository.save(this.userRepository.create({
            username,
            email,
            password: hashedPassword,
            isAdmin: false,
            isDisabled: false,
        }))

        return {
            id: user.id,
            username: user.username,
            email: user.email,
            isAdmin: user.isAdmin,
            isDisabled: user.isDisabled,
        }
    }

    async resetUserPassword(id: string, password: string) {
        const hashedPassword = await bcrypt.hash(password, 10)
        await this.userRepository.update(id, { password: hashedPassword })
        return { success: true }
    }

    async setUserStatus(id: string, isDisabled: boolean) {
        await this.userRepository.update(id, { isDisabled })
        return { success: true, isDisabled }
    }
}
