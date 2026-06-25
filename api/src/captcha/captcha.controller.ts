import { Controller, Get, Session } from '@nestjs/common';
import { CaptchaService } from './captcha.service';

@Controller('captcha')
export class CaptchaController {
    constructor(private captchaService: CaptchaService) { }

    @Get()
    async getCaptcha() {
        return this.captchaService.generate();
    }
}
