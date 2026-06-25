FROM node:20-alpine

WORKDIR /app

# 安装依赖

# 复制配置文件
COPY package*.json ./
COPY tsconfig.json ./
COPY nest-cli.json ./

# 安装依赖
RUN npm install

# 复制源代码
COPY src ./src

# 构建
RUN npm run build

# 创建 public 目录 (用于挂载前端静态文件)
RUN mkdir -p public

# 暴露端口
EXPOSE 3000

# 启动
CMD ["npm", "run", "start:prod"]
