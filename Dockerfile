# Bầu Cua Online Production Container
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.10.0 --activate
WORKDIR /app

# Stage 1: Dependencies
FROM base AS dependencies
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* turbo.json tsconfig.base.json ./
COPY packages/types/package.json ./packages/types/
COPY packages/engine/package.json ./packages/engine/
COPY apps/server/package.json ./apps/server/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile || pnpm install

# Stage 2: Build
FROM dependencies AS builder
COPY . .
RUN pnpm build

# Stage 3: Runner
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN corepack enable && corepack prepare pnpm@10.10.0 --activate
COPY --from=builder /app ./

EXPOSE 3000
EXPOSE 3001

CMD ["pnpm", "start"]
