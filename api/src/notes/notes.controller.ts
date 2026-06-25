import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { NotesService } from './notes.service';

@Controller('notes')
@UseGuards(AuthGuard('jwt'))
export class NotesController {
    constructor(private notesService: NotesService) { }

    @Get()
    async findAll(@Request() req, @Query('folderId') folderId?: string) {
        return this.notesService.findAll(req.user.userId, folderId);
    }

    @Get('favorites')
    async findFavorites(@Request() req) {
        return this.notesService.findFavorites(req.user.userId);
    }

    @Get('trash')
    async findDeleted(@Request() req) {
        return this.notesService.findDeleted(req.user.userId);
    }

    @Get('search')
    async search(@Request() req, @Query('q') q: string) {
        return this.notesService.search(req.user.userId, q);
    }

    @Get('stats')
    async getStats(@Request() req) {
        return this.notesService.getStats(req.user.userId);
    }

    @Get('shared-links')
    async listSharedLinks(@Request() req) {
        const origin = `${req.protocol}://${req.get('host')}`;
        return this.notesService.listSharedLinks(req.user.userId, origin);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req) {
        return this.notesService.findOne(id, req.user.userId);
    }

    @Post()
    async create(@Request() req, @Body() data: any) {
        return this.notesService.create(req.user.userId, data);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Request() req, @Body() data: any) {
        return this.notesService.update(id, req.user.userId, data);
    }

    // 静态路由必须在动态参数路由之前
    @Delete('trash/empty')
    async emptyTrash(@Request() req) {
        return this.notesService.emptyTrash(req.user.userId);
    }

    @Delete(':id')
    async delete(@Param('id') id: string, @Request() req) {
        return this.notesService.delete(id, req.user.userId);
    }

    @Post(':id/favorite')
    async toggleFavorite(@Param('id') id: string, @Request() req) {
        return this.notesService.toggleFavorite(id, req.user.userId);
    }

    @Post(':id/pin')
    async togglePin(@Param('id') id: string, @Request() req) {
        return this.notesService.togglePin(id, req.user.userId);
    }

    @Post(':id/color')
    async setColor(@Param('id') id: string, @Request() req, @Body() data: { color: string }) {
        return this.notesService.setColor(id, req.user.userId, data.color);
    }

    @Post(':id/restore')
    async restore(@Param('id') id: string, @Request() req) {
        return this.notesService.restore(id, req.user.userId);
    }

    @Delete(':id/permanent')
    async permanentDelete(@Param('id') id: string, @Request() req) {
        return this.notesService.permanentDelete(id, req.user.userId);
    }

    @Post(':id/share')
    async createShareLink(@Param('id') id: string, @Request() req) {
        const origin = `${req.protocol}://${req.get('host')}`;
        return this.notesService.createShareLink(id, req.user.userId, origin);
    }

    @Get(':id/share')
    async getShareInfo(@Param('id') id: string, @Request() req) {
        const origin = `${req.protocol}://${req.get('host')}`;
        return this.notesService.getShareInfo(id, req.user.userId, origin);
    }

    @Delete(':id/share')
    async revokeShareLink(@Param('id') id: string, @Request() req) {
        return this.notesService.revokeShareLink(id, req.user.userId);
    }
}
