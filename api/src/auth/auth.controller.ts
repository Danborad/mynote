import { Controller, Post, Body, Get, UseGuards, Request, BadRequestException, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { CaptchaService } from '../captcha/captcha.service';
import { IsString, MinLength, MaxLength } from 'class-validator';

export class RegisterDto {
    @IsString()
    @MinLength(2)
    @MaxLength(50)
    username: string;

    @IsString()
    @MinLength(6)
    password: string;

    @IsString()
    captchaId: string;

    @IsString()
    captchaText: string;

    @IsString()
    email?: string;
}

export class LoginDto {
    @IsString()
    username: string;

    @IsString()
    password: string;
}

@Controller('auth')
export class AuthController {
    constructor(
        private authService: AuthService,
        private captchaService: CaptchaService,
    ) { }

    @Post('register')
    async register(@Body() dto: RegisterDto) {
        const { username, password, captchaId, captchaText, email } = dto;

        // 验证必填字段
        if (!username || !password) {
            throw new BadRequestException('用户名和密码不能为空');
        }

        // 验证验证码
        if (!captchaId || !captchaText) {
            throw new BadRequestException('请输入计算结果');
        }

        if (!this.captchaService.verify(captchaId, captchaText)) {
            throw new BadRequestException('计算结果错误或验证码已过期');
        }

        return this.authService.register(username.trim(), password, email?.trim() || null);
    }

    @Post('login')
    async login(@Body() dto: LoginDto) {
        const { username, password } = dto;
        if (!username || !password) {
            throw new BadRequestException('用户名和密码不能为空');
        }
        return this.authService.login(username.trim(), password);
    }

    @Get('profile')
    @UseGuards(AuthGuard('jwt'))
    async getProfile(@Request() req) {
        return this.authService.getProfile(req.user.userId);
    }

    @Post('avatar')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads/avatars',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const ext = extname(file.originalname);
                cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
            }
        }),
        limits: { fileSize: 5 * 1024 * 1024 }, // 5MB Limit
        fileFilter: (req, file, cb) => {
            const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
            if (allowedMimes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new BadRequestException('仅支持 JPG、PNG、GIF、WebP 格式的图片'), false);
            }
        },
    }))
    async uploadAvatar(@Request() req, @UploadedFile() file) {
        if (!file) {
            throw new BadRequestException('请选择文件');
        }
        const avatarUrl = `/uploads/avatars/${file.filename}`;
        return this.authService.updateAvatar(req.user.userId, avatarUrl);
    }

    @Post('settings')
    @UseGuards(AuthGuard('jwt'))
    async updateSettings(@Request() req, @Body() body: { trashRetentionDays?: number; shareRetentionDays?: number; username?: string; webHomeLayout?: string; webHomeDensity?: string }) {
        return this.authService.updateSettings(req.user.userId, body);
    }

    @Post('password')
    @UseGuards(AuthGuard('jwt'))
    async changePassword(@Request() req, @Body() body: any) {
        if (!body.oldPassword || !body.newPassword) {
            throw new BadRequestException('请输入旧密码和新密码');
        }
        return this.authService.changePassword(req.user.userId, body);
    }
}
