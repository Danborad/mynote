import { Controller, Get, Param, Request } from '@nestjs/common';
import { NotesService } from './notes.service';

@Controller('notes/shared')
export class SharedNotesController {
    constructor(private notesService: NotesService) { }

    @Get(':token')
    async findShared(@Param('token') token: string, @Request() req) {
        const forwardedProto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
        const forwardedHost = String(req.get('x-forwarded-host') || '').split(',')[0].trim();
        const protocol = forwardedProto || req.protocol;
        const host = forwardedHost || req.get('host');
        return this.notesService.findSharedByToken(token, `${protocol}://${host}`);
    }
}
