# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20.19-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/backend/package.json ./apps/backend/
RUN pnpm install --frozen-lockfile

COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend

# DATABASE_URL is required by prisma.config.ts even during generate.
# Pass it as a build arg from Railway's build settings.
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL}

RUN pnpm run prisma:generate && pnpm run build

# ── Stage 2: run ──────────────────────────────────────────────────────────────
FROM node:20.19-alpine AS runner
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/backend/package.json ./apps/backend/
RUN pnpm install --frozen-lockfile --prod

COPY --from=builder /app/apps/backend/dist ./apps/backend/dist
COPY --from=builder /app/apps/backend/prisma ./apps/backend/prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

WORKDIR /app/apps/backend
EXPOSE 3000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main"]
