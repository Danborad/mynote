import { Controller, Post, Get, UseInterceptors, UploadedFile, BadRequestException, UseGuards, Request } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { NotesService } from '../notes/notes.service';

@Controller('files')
export class FilesController {
    constructor(private readonly notesService: NotesService) { }

    @Post('upload')
    @UseGuards(AuthGuard('jwt'))
    @UseInterceptors(FileInterceptor('file', {
        storage: diskStorage({
            destination: './uploads/attachments',
            filename: (req, file, cb) => {
                const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
                const ext = extname(file.originalname);
                cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
            }
        }),
        limits: { fileSize: 50 * 1024 * 1024 }, // 50MB Limit
        fileFilter: (req, file, cb) => {
            const allowedMimes = [
                // 图片
                'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp',
                // 音频
                'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/mp4', 'audio/aac', 'audio/flac',
                // 视频
                'video/mp4', 'video/webm', 'video/ogg', 'video/quicktime',
                // 文档
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'text/plain', 'text/markdown', 'text/csv',
            ];
            if (allowedMimes.includes(file.mimetype)) {
                cb(null, true);
            } else {
                cb(new BadRequestException(`不支持的文件类型: ${file.mimetype}`), false);
            }
        },
    }))
    async uploadFile(@UploadedFile() file) {
        if (!file) {
            throw new BadRequestException('请选择文件');
        }
        return {
            originalName: file.originalname,
            filename: file.filename,
            url: `/uploads/attachments/${file.filename}`,
            size: file.size,
            mimetype: file.mimetype
        };
    }

    @Get('stats')
    @UseGuards(AuthGuard('jwt'))
    async getStorageStats(@Request() req) {
        // 使用 NotesService 计算当前用户的实际存储占用
        let totalSize = 0;
        try {
            totalSize = await this.notesService.calculateUserStorage(req.user.userId);
            console.log(`[Storage Stats] User ${req.user.userId} usage: ${totalSize} bytes`);
        } catch (error) {
            console.error('[Storage Stats] Error:', error);
        }

        const limit = 1024 * 1024 * 1024; // 1GB

        return {
            used: totalSize,
            limit: limit,
            percentage: Math.min(Math.round((totalSize / limit) * 100), 100)
        };
    }
}