FROM node:20.19-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/backend/package.json ./apps/backend/
RUN pnpm install --no-frozen-lockfile

COPY apps/backend ./apps/backend

WORKDIR /app/apps/backend
RUN pnpm run prisma:generate && pnpm run build
RUN CI=true pnpm prune --prod

EXPOSE 3000
CMD ["sh", "-c", "node_modules/.bin/prisma db push && node dist/main"]
