import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FoldersService } from './folders.service';

@Controller('folders')
@UseGuards(AuthGuard('jwt'))
export class FoldersController {
    constructor(private foldersService: FoldersService) { }

    @Get()
    async findAll(@Request() req, @Query('parentId') parentId?: string) {
        if (parentId) {
            return this.foldersService.findChildren(req.user.userId, parentId);
        }
        return this.foldersService.findRootFolders(req.user.userId);
    }

    @Get('all')
    async findAllFlat(@Request() req) {
        return this.foldersService.findAll(req.user.userId);
    }

    @Get(':id')
    async findOne(@Param('id') id: string, @Request() req) {
        return this.foldersService.findOne(id, req.user.userId);
    }

    @Post()
    async create(@Request() req, @Body() data: any) {
        return this.foldersService.create(req.user.userId, data);
    }

    @Put(':id')
    async update(@Param('id') id: string, @Request() req, @Body() data: any) {
        return this.foldersService.update(id, req.user.userId, data);
    }

    @Delete(':id')
    async delete(@Param('id') id: string, @Request() req) {
        return this.foldersService.delete(id, req.user.userId);
    }
}
