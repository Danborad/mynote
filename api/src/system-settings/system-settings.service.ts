import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemSetting } from '../entities/system-setting.entity';

@Injectable()
export class SystemSettingsService {
    constructor(
        @InjectRepository(SystemSetting)
        private systemSettingRepository: Repository<SystemSetting>,
    ) { }

    async getAllowRegistration() {
        const setting = await this.systemSettingRepository.findOne({ where: { key: 'allowRegistration' } });
        if (!setting) {
            await this.systemSettingRepository.save({ key: 'allowRegistration', value: true });
            return true;
        }
        return Boolean(setting.value);
    }

    async setAllowRegistration(allowRegistration: boolean) {
        await this.systemSettingRepository.save({ key: 'allowRegistration', value: allowRegistration });
        return allowRegistration;
    }
}
