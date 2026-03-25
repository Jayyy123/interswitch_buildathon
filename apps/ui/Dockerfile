# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20.19-alpine AS builder
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/ui/package.json ./apps/ui/
RUN pnpm install --frozen-lockfile

COPY apps/ui ./apps/ui

WORKDIR /app/apps/ui
RUN pnpm run build

# ── Stage 2: run ──────────────────────────────────────────────────────────────
FROM node:20.19-alpine AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/apps/ui/public ./public
COPY --from=builder /app/apps/ui/.next/standalone ./
COPY --from=builder /app/apps/ui/.next/static ./.next/static

EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
