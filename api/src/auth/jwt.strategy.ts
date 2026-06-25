import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        const secret = process.env.JWT_SECRET;
        if (!secret) {
            console.warn('⚠️ 警告: 未设置 JWT_SECRET 环境变量，使用内置默认密钥。生产环境请务必设置！');
        }
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: secret || '900fd0a5f81ecfcbc6e7bb1ffb251eda4f448626ecf6e9d706bdb2e094ca2500',
        });
    }

    async validate(payload: any) {
        return { userId: payload.sub, username: payload.username, isAdmin: payload.isAdmin };
    }
}
