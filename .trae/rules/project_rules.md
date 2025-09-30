# Repository Guidelines

## Project Structure & Module Organization
- Monorepo with two apps:
  - `api.quiz/` — Laravel API (PHP). Key dirs: `app/`, `routes/`, `database/`, `tests/`, `config/`.
  - `quiz/` — Next.js web (TypeScript/React). Key dirs: `src/app/`, `src/components/`, `public/`.
- Docs and planning: root `CoreFeature.md`, feature docs under each app (e.g., `api.quiz/README.md`, `quiz/REQUIREMENTS.md`).

## Build, Test, and Development Commands
- Backend (from `api.quiz/`):
  - `composer install` — install PHP deps.
  - `cp .env.example .env && php artisan key:generate` — setup env.
  - `php artisan migrate --seed` — DB schema + seeders.
  - API base URL: `http://localhost:8000` (no need to run `artisan serve`).
  - `php artisan test` or `vendor/bin/phpunit` — run tests.
- Frontend (from `quiz/`):
  - `npm install` — install deps.
  - `npm run dev` — start Next.js dev server.
  - `npm run build && npm run start` — production build/serve.
  - `npm run lint` — ESLint check.

## Coding Style & Naming Conventions
- PHP (Laravel): PSR-12, 4-space indent. Classes `StudlyCase`, methods `camelCase`, constants `ALL_CAPS`. Controllers in `app/Http/Controllers`, Models in `app/Models` (singular).
- TypeScript/React: 2-space indent. Components `PascalCase` in `src/components`, hooks `useX.ts` in `src/hooks`. Prefer functional components + hooks. Use Tailwind classes in `*.tsx` and global styles in `src/app/globals.css`.
- Lint/format: PHP via built-in Laravel conventions; JS/TS via `eslint.config.mjs`. Run `npm run lint` before PRs.

## Testing Guidelines
- Backend: PHPUnit with Feature/Unit suites in `api.quiz/tests`. Add feature tests for new routes/controllers; factories/seeders available in `database/`.
- Frontend: No formal test setup yet; if adding logic-heavy code, include Jest/React Testing Library tests in `__tests__/` or alongside components (e.g., `Component.test.tsx`).

## Commit & Pull Request Guidelines
- Commits: Prefer Conventional Commits (e.g., `feat(api): add quiz approval endpoint`, `fix(ui): correct wallet balance rounding`). Keep scope small and messages imperative.
- PRs: Include description, linked issues, setup/demo steps, and screenshots for UI changes. Ensure linting passes and backend tests are green. Mention migrations and breaking changes.

## Security & Configuration Tips
- Never commit secrets; use `.env` files (`api.quiz/.env`, `quiz/.env.local`).
- Document required env vars and defaults in the PR when adding new configuration.
