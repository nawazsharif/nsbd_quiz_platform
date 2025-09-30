<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use RuntimeException;
use Smalot\PdfParser\Parser;

class AIQuestionGenerator
{
    public function __construct(private ?Parser $pdfParser = null)
    {
        $this->pdfParser ??= new Parser();
    }

    public function isConfigured(): bool
    {
        return filled(config('ai.openai.api_key'));
    }

    public function generateFromUpload(UploadedFile $file, array $options = []): array
    {
        $extension = strtolower($file->getClientOriginalExtension());
        $mime = $file->getMimeType() ?: '';

        if ($extension === 'pdf' || str_contains($mime, 'pdf')) {
            return $this->generateFromPdf($file, $options);
        }

        if (Str::startsWith($mime, 'image/') || in_array($extension, ['jpg', 'jpeg', 'png', 'gif', 'webp'], true)) {
            return $this->generateFromImage($file, $options);
        }

        throw new RuntimeException('Unsupported file type for AI generation. Provide a PDF or an image.');
    }

    protected function generateFromPdf(UploadedFile $file, array $options = []): array
    {
        $text = $this->extractTextFromPdf($file);
        if (blank($text)) {
            throw new RuntimeException('Unable to extract text from the provided PDF.');
        }

        $instructions = $this->buildInstructionText($options);
        $content = [
            ['type' => 'text', 'text' => $instructions],
            ['type' => 'text', 'text' => Str::limit($text, 15000, '')],
        ];

        $response = $this->dispatchToOpenAi($content, $options);

        return $this->mapAiResponse($response);
    }

    protected function generateFromImage(UploadedFile $file, array $options = []): array
    {
        $instructions = $this->buildInstructionText($options);

        $base64 = base64_encode((string) file_get_contents($file->getRealPath()));
        $mime = $file->getMimeType() ?: 'image/png';
        $dataUrl = sprintf('data:%s;base64,%s', $mime, $base64);

        $content = [
            ['type' => 'text', 'text' => $instructions],
            ['type' => 'image_url', 'image_url' => ['url' => $dataUrl, 'detail' => 'low']],
        ];

        $response = $this->dispatchToOpenAi($content, $options);

        return $this->mapAiResponse($response);
    }

    protected function extractTextFromPdf(UploadedFile $file): string
    {
        try {
            $document = $this->pdfParser?->parseFile($file->getRealPath());
            $text = $document?->getText() ?? '';
        } catch (\Throwable $e) {
            throw new RuntimeException('Failed to parse PDF: ' . $e->getMessage(), previous: $e);
        }

        return trim(preg_replace('/\s+/', ' ', $text));
    }

    protected function buildInstructionText(array $options): string
    {
        $count = $this->resolveCount($options['count'] ?? null);
        $type = $this->resolveQuestionType($options['question_type'] ?? null);
        $difficulty = $options['difficulty'] ?? null;

        $parts = [
            "You are an assistant that creates {$type} quiz questions.",
            "Generate {$count} high-quality questions based only on the provided source.",
            'Each question must include a concise explanation referencing the source material.',
        ];

        if ($difficulty) {
            $parts[] = "Target difficulty: {$difficulty}.";
        }

        if ($type === 'multiple choice') {
            $parts[] = 'Provide exactly 4 answer options per question with boolean flags for correctness.';
        }

        $parts[] = 'Respond strictly in JSON matching the schema. Avoid markdown or prose.';

        return implode(' ', $parts);
    }

    protected function dispatchToOpenAi(array $content, array $options): array
    {
        if (!$this->isConfigured()) {
            throw new RuntimeException('AI provider is not configured. Set an OPENAI_API_KEY.');
        }

        $payload = [
            'model' => config('ai.openai.model', 'gpt-4o-mini'),
            'messages' => [
                [
                    'role' => 'system',
                    'content' => 'You generate quiz questions and respond only with JSON conforming to the required schema.'
                ],
                [
                    'role' => 'user',
                    'content' => $content,
                ],
            ],
            'temperature' => config('ai.temperature', 0.3),
            'response_format' => $this->responseFormat(),
        ];

        $baseUrl = rtrim(config('ai.openai.base_url', 'https://api.openai.com/v1'), '/');

        $response = Http::withToken((string) config('ai.openai.api_key'))
            ->acceptJson()
            ->post($baseUrl . '/chat/completions', $payload);

        if (!$response->ok()) {
            $message = $response->json('error.message') ?? $response->body();
            throw new RuntimeException('AI request failed: ' . $message);
        }

        $content = $response->json('choices.0.message.content');
        if (!is_string($content)) {
            throw new RuntimeException('Unexpected AI response format.');
        }

        $decoded = json_decode($content, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('Unable to decode AI response.');
        }

        return $decoded;
    }

    protected function responseFormat(): array
    {
        return [
            'type' => 'json_schema',
            'json_schema' => [
                'name' => 'quiz_questions',
                'schema' => [
                    'type' => 'object',
                    'required' => ['questions'],
                    'properties' => [
                        'questions' => [
                            'type' => 'array',
                            'items' => [
                                'type' => 'object',
                                'required' => ['type', 'text'],
                                'properties' => [
                                    'type' => [
                                        'type' => 'string',
                                        'enum' => ['mcq', 'true_false', 'short_desc'],
                                    ],
                                    'text' => ['type' => 'string'],
                                    'prompt' => ['type' => 'string'],
                                    'sample_answer' => ['type' => 'string'],
                                    'explanation' => ['type' => 'string'],
                                    'points' => ['type' => 'number'],
                                    'correct_boolean' => ['type' => 'boolean'],
                                    'options' => [
                                        'type' => 'array',
                                        'items' => [
                                            'type' => 'object',
                                            'required' => ['text', 'is_correct'],
                                            'properties' => [
                                                'text' => ['type' => 'string'],
                                                'is_correct' => ['type' => 'boolean'],
                                            ],
                                        ],
                                    ],
                                ],
                            ],
                        ],
                    ],
                ],
            ],
        ];
    }

    protected function mapAiResponse(array $data): array
    {
        $questions = Arr::get($data, 'questions');
        if (!is_array($questions)) {
            throw new RuntimeException('AI response missing questions array.');
        }

        $results = [];
        foreach ($questions as $question) {
            if (!is_array($question)) {
                continue;
            }

            $type = $this->normalizeType(Arr::get($question, 'type', 'mcq'));
            $points = $this->resolvePoints($question['points'] ?? null);
            $explanation = isset($question['explanation']) ? trim((string) $question['explanation']) : null;

            if ($type === 'mcq') {
                $options = $this->normalizeOptions($question['options'] ?? []);
                if (count($options) < 2) {
                    continue;
                }
                $results[] = [
                    'type' => 'mcq',
                    'text' => trim((string) Arr::get($question, 'text', '')),
                    'points' => $points,
                    'multiple_correct' => $this->hasMultipleCorrect($options),
                    'options' => $options,
                    'explanation' => $explanation,
                ];
            } elseif ($type === 'true_false') {
                $results[] = [
                    'type' => 'true_false',
                    'text' => trim((string) Arr::get($question, 'text', '')),
                    'points' => $points,
                    'correct_boolean' => (bool) Arr::get($question, 'correct_boolean', true),
                    'explanation' => $explanation,
                ];
            } elseif ($type === 'short_desc') {
                $results[] = [
                    'type' => 'short_desc',
                    'prompt' => trim((string) Arr::get($question, 'prompt', Arr::get($question, 'text', ''))),
                    'sample_answer' => Arr::get($question, 'sample_answer') ? trim((string) Arr::get($question, 'sample_answer')) : null,
                    'points' => $points,
                    'requires_manual_grading' => true,
                    'explanation' => $explanation,
                ];
            }
        }

        $max = $this->resolveCount(count($results));

        return array_slice($results, 0, $max);
    }

    protected function resolveCount($requested): int
    {
        $max = max(1, (int) config('ai.max_questions', 20));
        $value = (int) ($requested ?: 5);
        return max(1, min($value, $max));
    }

    protected function resolveQuestionType(?string $type): string
    {
        return match (strtolower((string) $type)) {
            'true_false', 'true-false', 'boolean' => 'true/false',
            'short_desc', 'short-answer', 'short_answer' => 'short answer',
            default => 'multiple choice',
        };
    }

    protected function resolvePoints($points): int
    {
        $value = (int) ($points ?? 1);
        return $value > 0 ? $value : 1;
    }

    protected function normalizeType(string $type): string
    {
        return match (strtolower($type)) {
            'true_false', 'true-false', 'boolean' => 'true_false',
            'short_desc', 'short-answer', 'short_answer' => 'short_desc',
            default => 'mcq',
        };
    }

    protected function normalizeOptions($options): array
    {
        if (!is_array($options)) {
            return [];
        }

        $normalized = [];
        foreach ($options as $option) {
            if (!is_array($option)) {
                continue;
            }
            $text = trim((string) Arr::get($option, 'text', ''));
            if ($text === '') {
                continue;
            }
            $normalized[] = [
                'text' => $text,
                'is_correct' => (bool) Arr::get($option, 'is_correct', false),
            ];
        }

        return $normalized;
    }

    protected function hasMultipleCorrect(array $options): bool
    {
        $correct = array_filter($options, fn ($opt) => !empty($opt['is_correct']));
        return count($correct) > 1;
    }
}
