import { Module } from '@nestjs/common';
import { FilesController } from './files.controller';
import { NotesModule } from '../notes/notes.module';

@Module({
    imports: [NotesModule],
    controllers: [FilesController],
})
export class FilesModule { }
