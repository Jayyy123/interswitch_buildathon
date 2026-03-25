FROM node:20.19-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/backend/package.json ./apps/backend/
RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/backend

EXPOSE 3000

# Generate Prisma client, run migrations, start in watch mode
CMD ["sh", "-c", "npx prisma generate && npx prisma migrate deploy && pnpm run start:dev"]
