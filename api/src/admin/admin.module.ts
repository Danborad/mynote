import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../entities/user.entity';
import { Folder } from '../entities/folder.entity';
import { Note } from '../entities/note.entity';
import { SystemSettingsModule } from '../system-settings/system-settings.module';
import { NotesModule } from '../notes/notes.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminGuard } from './admin.guard';

@Module({
    imports: [TypeOrmModule.forFeature([User, Folder, Note]), SystemSettingsModule, NotesModule],
    controllers: [AdminController],
    providers: [AdminService, AdminGuard],
    exports: [AdminService, AdminGuard],
})
export class AdminModule { }
