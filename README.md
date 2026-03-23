# Omo Health Monorepo

Frontend and backend apps for the Omo Health platform.

## Apps

- `apps/ui` - Next.js PWA frontend
- `apps/backend` - NestJS backend

## Important: Commit Message Format

**This repo enforces Conventional Commits via commitlint.**

If your commit message does not match the format below, commit hooks will fail.

### Required format

`type(scope): subject`

### Examples

- `feat(ui): add member csv upload preview`
- `fix(backend): handle claim status transition`
- `chore(repo): update lint-staged config`

### Common mistake

Do **not** write a space before `(` in scope.

- Wrong: `feat (ui): add upload preview`
- Right: `feat(ui): add upload preview`

### Allowed types

`feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

### Additional rules

- Subject must be lower-case
- Header max length is 100 characters
