import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { User } from './entities/user.entity';
import { Folder } from './entities/folder.entity';
import { Note } from './entities/note.entity';
import { SystemSetting } from './entities/system-setting.entity';
import { AuthModule } from './auth/auth.module';
import { NotesModule } from './notes/notes.module';
import { FoldersModule } from './folders/folders.module';
import { FilesModule } from './files/files.module';
import { CaptchaModule } from './captcha/captcha.module';
import { HealthController } from './health.controller';
import { VersionController } from './version.controller';
import { SystemSettingsModule } from './system-settings/system-settings.module';
import { TypeOrmModule as FeatureTypeOrmModule } from '@nestjs/typeorm';
import { AdminBootstrapService } from './admin/admin-bootstrap.service';
import { AdminModule } from './admin/admin.module';

@Module({
    imports: [

        // 静态文件服务 - 头像等上传文件 (必须在前端托管之前，否则会被前端路由拦截)
        ServeStaticModule.forRoot({
            rootPath: join(process.cwd(), 'uploads'),
            serveRoot: '/uploads',
        }),
        // 静态文件服务 - 托管前端
        ServeStaticModule.forRoot({
            rootPath: join(process.cwd(), 'public'),
            exclude: ['/api*'],
        }),
        // 数据库连接
        TypeOrmModule.forRoot({
            type: 'postgres',
            url: process.env.DATABASE_URL || 'postgresql://mynote:mynote_secret@localhost:5432/mynote',
            entities: [User, Folder, Note, SystemSetting],
            synchronize: true,
            logging: process.env.NODE_ENV !== 'production',
        }),
        FeatureTypeOrmModule.forFeature([User]),
        CaptchaModule,
        SystemSettingsModule,
        AdminModule,
        AuthModule,
        NotesModule,
        FoldersModule,
        FilesModule,
    ],
    controllers: [HealthController, VersionController],
    providers: [AdminBootstrapService],
})
export class AppModule { }
