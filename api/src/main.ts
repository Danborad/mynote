import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // 全局验证管道
    app.useGlobalPipes(new ValidationPipe({
        whitelist: true,
        transform: true,
    }));

    // API 前缀
    app.setGlobalPrefix('api');

    const port = process.env.PORT || 3665;
    await app.listen(port, '0.0.0.0');
    console.log(`MyNote API 运行在 http://localhost:${port}`);
}
bootstrap();
