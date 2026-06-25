import { Controller, Get, Param } from '@nestjs/common';
import { NotesService } from './notes.service';

@Controller('notes/shared')
export class SharedNotesController {
    constructor(private notesService: NotesService) { }

    @Get(':token')
    async findShared(@Param('token') token: string) {
        return this.notesService.findSharedByToken(token);
    }
}
