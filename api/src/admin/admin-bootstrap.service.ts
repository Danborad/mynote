import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../entities/user.entity';

@Injectable()
export class AdminBootstrapService implements OnModuleInit {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
    ) { }

    async onModuleInit() {
        const username = (process.env.ADMIN_USERNAME || '').trim();
        const password = (process.env.ADMIN_PASSWORD || '').trim();

        if (!username || !password) return;

        const existingAdmin = await this.userRepository.findOne({ where: { isAdmin: true } });
        if (existingAdmin) return;

        const existingUserWithUsername = await this.userRepository.findOne({ where: { username } });
        const hashedPassword = await bcrypt.hash(password, 10);

        if (existingUserWithUsername) {
            existingUserWithUsername.isAdmin = true;
            existingUserWithUsername.password = hashedPassword;
            await this.userRepository.save(existingUserWithUsername);
            return;
        }

        await this.userRepository.save(
            this.userRepository.create({
                username,
                password: hashedPassword,
                isAdmin: true,
            }),
        );
    }
}
