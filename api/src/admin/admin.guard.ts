import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';

@Injectable()
export class AdminGuard implements CanActivate {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const userId = request.user?.userId;
        if (!userId) {
            throw new ForbiddenException('未登录或无管理员权限');
        }

        const user = await this.userRepository.findOne({ where: { id: userId } });
        if (!user?.isAdmin) {
            throw new ForbiddenException('仅管理员可访问');
        }

        request.adminUser = user;
        return true;
    }
}
