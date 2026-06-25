import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Note } from '../entities/note.entity';
import { User } from '../entities/user.entity';
import { NotesService } from './notes.service';
import { NotesController } from './notes.controller';
import { SharedNotesController } from './shared-notes.controller';

@Module({
    imports: [TypeOrmModule.forFeature([Note, User])],
    controllers: [NotesController, SharedNotesController],
    providers: [NotesService],
    exports: [NotesService],
})
export class NotesModule { }
