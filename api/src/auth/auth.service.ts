import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';
import { SystemSettingsService } from '../system-settings/system-settings.service';

@Injectable()
export class AuthService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        private jwtService: JwtService,
        private systemSettingsService: SystemSettingsService,
    ) { }

    async register(username: string, password: string, email: string | null = null) {
        const allowRegistration = await this.systemSettingsService.getAllowRegistration();
        if (!allowRegistration) {
            throw new UnauthorizedException('注册功能已关闭');
        }

        // 检查用户名或邮箱是否已存在
        const existing = await this.userRepository.findOne({ where: [{ username }, ...(email ? [{ email }] : [])] });
        if (existing) {
            throw new ConflictException('用户名或邮箱已存在');
        }

        // 加密密码
        const hashedPassword = await bcrypt.hash(password, 10);

        // 创建用户
        const user = this.userRepository.create({
            username,
            email,
            password: hashedPassword,
            isAdmin: false,
        });
        await this.userRepository.save(user);

        return this.generateToken(user);
    }

    async login(username: string, password: string) {
        const user = await this.userRepository.findOne({ where: { username } });
        if (!user) {
            throw new UnauthorizedException('用户名或密码错误');
        }

        if (user.isDisabled) {
            throw new UnauthorizedException('账号已被禁用');
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('用户名或密码错误');
        }

        user.lastLoginAt = new Date();
        await this.userRepository.save(user);

        return this.generateToken(user);
    }

    private generateToken(user: User) {
        const payload = { sub: user.id, username: user.username, isAdmin: user.isAdmin };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                isAdmin: user.isAdmin,
                avatar: user.avatar,
                trashRetentionDays: user.trashRetentionDays,
                shareRetentionDays: user.shareRetentionDays,
                webHomeLayout: user.webHomeLayout,
                webHomeDensity: user.webHomeDensity,
            },
        };
    }

    async updateAvatar(userId: string, avatarUrl: string) {
        await this.userRepository.update(userId, { avatar: avatarUrl });
        return this.userRepository.findOne({ where: { id: userId } });
    }

    async updateSettings(userId: string, settings: { trashRetentionDays?: number; shareRetentionDays?: number; username?: string; webHomeLayout?: string; webHomeDensity?: string }) {
        if (typeof settings.username === 'string') {
            const username = settings.username.trim();
            if (username.length < 2 || username.length > 50) {
                throw new BadRequestException('用户名长度需在 2-50 个字符之间');
            }

            const existing = await this.userRepository.findOne({ where: { username } });
            if (existing && existing.id !== userId) {
                throw new ConflictException('用户名已存在');
            }

            await this.userRepository.update(userId, { username });
        }

        if (typeof settings.trashRetentionDays === 'number') {
            await this.userRepository.update(userId, { trashRetentionDays: settings.trashRetentionDays });
        }

        if (typeof settings.shareRetentionDays === 'number') {
            await this.userRepository.update(userId, { shareRetentionDays: settings.shareRetentionDays });
        }

        if (typeof settings.webHomeLayout === 'string') {
            const webHomeLayout = settings.webHomeLayout === 'two' ? 'two' : 'one';
            await this.userRepository.update(userId, { webHomeLayout });
        }

        if (typeof settings.webHomeDensity === 'string') {
            const allowedDensity = ['normal', 'compact', 'ultra'];
            const webHomeDensity = allowedDensity.includes(settings.webHomeDensity) ? settings.webHomeDensity : 'normal';
            await this.userRepository.update(userId, { webHomeDensity });
        }

        return this.userRepository.findOne({ where: { id: userId } });
    }

    async getProfile(userId: string) {
        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user) {
            return null;
        }

        // 计算存储空间 (简单估算: 头像 + 笔记内容长度)
        // 实际生产环境应该查询数据库统计
        const notes = await this.userRepository.manager.getRepository('notes').find({
            where: { userId: userId },
            select: ['content']
        });

        let storageUsage = 0;
        // 简单的头像大小估算 (如果存在头像则算 50KB)
        if (user.avatar) {
            storageUsage += 50 * 1024;
        }

        // 笔记内容大小
        notes.forEach((note: any) => {
            if (note.content) {
                storageUsage += Buffer.byteLength(note.content, 'utf8');
            }
        });

        // 附件大小暂忽略，后续完善

        const { password, ...result } = user;
        return { ...result, storageUsage };
    }
    async changePassword(userId: string, body: any) {
        const { oldPassword, newPassword } = body;
        const user = await this.userRepository.findOne({ where: { id: userId } });

        if (!user) {
            throw new UnauthorizedException('用户不存在');
        }

        const isPasswordValid = await bcrypt.compare(oldPassword, user.password);
        if (!isPasswordValid) {
            throw new UnauthorizedException('旧密码错误');
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.userRepository.update(userId, { password: hashedPassword });

        return { message: '密码修改成功' };
    }
}
