FROM node:20.19-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-workspace.yaml pnpm-lock.yaml .npmrc ./
COPY apps/ui/package.json ./apps/ui/
RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/ui

EXPOSE 3000

CMD ["pnpm", "run", "dev"]
