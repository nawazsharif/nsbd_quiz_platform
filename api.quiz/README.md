<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## About Laravel

- **Authentication & Authorization**: JWT-based authentication with role-based permissions
- **Quiz Management**: Create, manage, and take quizzes with different question types
- **Course Management**: Create and manage courses with content and progress tracking
- **Wallet System**: Digital wallet for payments and withdrawals
- **Review System**: Rate and review quizzes and courses
- **Bookmark System**: Bookmark favorite quizzes and courses
- **Admin Features**: Approval workflows for content moderation
- **Bulk Question Tools**: CSV/Excel imports and AI-assisted question generation

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

You may also try the [Laravel Bootcamp](https://bootcamp.laravel.com), where you will be guided through building a modern Laravel application from scratch.

If you don't feel like reading, [Laracasts](https://laracasts.com) can help. Laracasts contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

## Laravel Sponsors

## Question Import & AI Generation

- **Bulk import endpoint**: `POST /api/quizzes/{quiz}/questions/import`
  - Accepts `.csv`, `.xlsx`, or `.xls` uploads.
  - Supports the columns `type`, `question`, `options`, `correct_options`, `points`, `correct`, and `sample_answer`.
  - MCQ rows can mark correct answers with an asterisk (e.g. `*Option A`) or by listing indexes/text in `correct_options` (e.g. `1|3`).
  - True/False rows use the `correct` column (`true`, `false`, `yes`, `no`).
- **AI generation endpoint**: `POST /api/quizzes/{quiz}/questions/generate-ai`
  - Accepts PDF or image uploads and generates new questions using the configured AI provider.
  - Optional body fields: `count` (max `AI_MAX_QUESTIONS`), `question_type` (`mcq`, `true_false`, `short_desc`), `difficulty` (`easy`, `medium`, `hard`).
- **Environment variables**:
  - `OPENAI_API_KEY` – required to enable AI generation.
  - `OPENAI_MODEL` (default `gpt-4o-mini`), `AI_MAX_QUESTIONS`, `AI_TEMPERATURE` to fine-tune behaviour.

See `config/ai.php` for provider settings and sensible defaults.

## Testing

### Premium Partners

- **[Vehikl](https://vehikl.com)**
- **[Tighten Co.](https://tighten.co)**
- **[Kirschbaum Development Group](https://kirschbaumdevelopment.com)**
- **[64 Robots](https://64robots.com)**
- **[Curotec](https://www.curotec.com/services/technologies/laravel)**
- **[DevSquad](https://devsquad.com/hire-laravel-developers)**
- **[Redberry](https://redberry.international/laravel-development)**
- **[Active Logic](https://activelogic.com)**

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
