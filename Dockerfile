FROM node:20-alpine AS web-builder

WORKDIR /app/web

COPY web/package.json web/package-lock.json ./
RUN npm ci

COPY web/ ./
RUN npx vite build


FROM node:20-alpine AS api-builder

WORKDIR /app/api

COPY api/package.json api/package-lock.json ./
COPY api/tsconfig.json api/nest-cli.json ./
RUN npm ci

COPY api/src ./src
COPY api/scripts ./scripts
RUN npm run build
RUN npm prune --omit=dev


FROM node:20-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3665

COPY --from=api-builder /app/api/package.json ./package.json
COPY --from=api-builder /app/api/package-lock.json ./package-lock.json
COPY --from=api-builder /app/api/node_modules ./node_modules
COPY --from=api-builder /app/api/dist ./dist
COPY --from=web-builder /app/web/dist ./public

RUN mkdir -p /app/uploads/attachments /app/uploads/avatars /app/backups

EXPOSE 3665

CMD ["node", "dist/main"]
