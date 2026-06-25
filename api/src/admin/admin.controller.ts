import { Body, Controller, Get, Post, Put, Request, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AdminGuard } from './admin.guard';
import { AdminService } from './admin.service';
import { Response } from 'express';

@Controller('admin')
@UseGuards(AuthGuard('jwt'), AdminGuard)
export class AdminController {
    constructor(private readonly adminService: AdminService) { }

    @Get('settings')
    async getSettings() {
        return this.adminService.getAdminSettings();
    }

    @Get('overview')
    async getOverview() {
        return this.adminService.getOverview();
    }

    @Put('settings/registration')
    async updateRegistration(@Body() body: { allowRegistration: boolean }) {
        return this.adminService.updateRegistrationSetting(Boolean(body.allowRegistration));
    }

    @Get('backup/export')
    async exportBackup(@Res() res: Response) {
        const { archive, filename } = await this.adminService.exportInstanceBackup();
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        archive.pipe(res);
        await archive.finalize();
    }

    @Get('users')
    async listUsers() {
        return this.adminService.listUsers();
    }

    @Post('users')
    async createUser(@Body() body: { username: string; password: string; email?: string }) {
        return this.adminService.createUser(body.username?.trim(), body.password, body.email?.trim() || null);
    }

    @Post('users/:id/reset-password')
    async resetUserPassword(@Request() req: any, @Body() body: { id?: string; password: string }) {
        return this.adminService.resetUserPassword(body.id || req.params.id, body.password);
    }

    @Put('users/:id/status')
    async updateUserStatus(@Request() req: any, @Body() body: { id?: string; isDisabled: boolean }) {
        return this.adminService.setUserStatus(body.id || req.params.id, Boolean(body.isDisabled));
    }

    @Post('backup/import/validate')
    async validateImport(@Body() body: any) {
        return this.adminService.validateInstanceBackupImport(body);
    }

    @Post('backup/import/execute')
    async executeImport(@Body() body: any) {
        return this.adminService.executeInstanceBackupImport(body);
    }
}
