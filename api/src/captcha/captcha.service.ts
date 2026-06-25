import { Injectable } from '@nestjs/common';

interface CaptchaData {
    id: string;
    answer: string;
    expireAt: number;
}

@Injectable()
export class CaptchaService {
    private captchaStore: Map<string, CaptchaData> = new Map();

    // 生成唯一 ID
    private generateId(): string {
        return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    }

    // 生成随机颜色
    private randomColor(): string {
        const colors = ['#2c3e50', '#8e44ad', '#2980b9', '#c0392b', '#16a085', '#d35400'];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    // 生成算术题 SVG
    generate(): { id: string; image: string } {
        const a = Math.floor(Math.random() * 20) + 1;
        const b = Math.floor(Math.random() * 20) + 1;
        const operator = Math.random() > 0.5 ? '+' : '-';

        // 确保减法结果非负，或者直接允许负数（用户说 20 以内，通常指结果或操作数）
        // 为了简单，如果是减法且 a < b，交换 a 和 b
        let num1 = a;
        let num2 = b;
        if (operator === '-' && a < b) {
            num1 = b;
            num2 = a;
        }

        const expression = `${num1} ${operator} ${num2} = ?`;
        const answer = operator === '+' ? (num1 + num2).toString() : (num1 - num2).toString();
        const id = this.generateId();

        // 存储答案
        this.captchaStore.set(id, {
            id,
            answer,
            expireAt: Date.now() + 5 * 60 * 1000,
        });
        this.cleanup();

        // 生成 SVG
        // 简单的 SVG，带有噪点背景
        const width = 120;
        const height = 40;
        const bgColor = '#f0f2f5';
        const textColor = this.randomColor();

        // 生成一些干扰线 SVG 路径
        let noiseLines = '';
        for (let i = 0; i < 5; i++) {
            const x1 = Math.random() * width;
            const y1 = Math.random() * height;
            const x2 = Math.random() * width;
            const y2 = Math.random() * height;
            noiseLines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${this.randomColor()}" stroke-width="1" opacity="0.3" />`;
        }

        const svg = `
      <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${bgColor}"/>
        ${noiseLines}
        <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="20" font-weight="bold" fill="${textColor}" dominant-baseline="middle" text-anchor="middle" letter-spacing="2">
          ${expression}
        </text>
      </svg>
    `;

        // 转换为 Base64
        const image = `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;

        return { id, image };
    }

    // 验证验证码
    verify(id: string, text: string): boolean {
        const data = this.captchaStore.get(id);

        if (!data) {
            return false;
        }

        this.captchaStore.delete(id);

        if (Date.now() > data.expireAt) {
            return false;
        }

        return data.answer === text.trim();
    }

    // 清理过期验证码
    private cleanup(): void {
        const now = Date.now();
        for (const [id, data] of this.captchaStore) {
            if (now > data.expireAt) {
                this.captchaStore.delete(id);
            }
        }
    }
}
