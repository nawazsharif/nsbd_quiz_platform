<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\GenerateQuizQuestionsRequest;
use App\Http\Requests\ImportQuizQuestionsRequest;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\Quiz;
use App\Services\AIQuestionGenerator;
use Illuminate\Http\Response;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Rap2hpoutre\FastExcel\FastExcel;

class QuizQuestionBulkController extends Controller
{
    public function import(ImportQuizQuestionsRequest $request, Quiz $quiz)
    {
        if (!$this->canManageQuiz($request->user(), $quiz)) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $file = $request->file('file');
        $defaultType = $request->input('default_type');
        $defaultPoints = $request->integer('default_points') ?: 1;
        $startOrder = $request->integer('start_order_index');

        $nextOrder = $startOrder ?: ((int) $quiz->questions()->max('order_index') + 1);

        $extension = strtolower($file->getClientOriginalExtension() ?: '');
        $temporaryPath = $file->getRealPath();
        $importPath = $temporaryPath;

        if ($extension && !Str::endsWith($temporaryPath, $extension)) {
            $importPath = $temporaryPath . '.' . $extension;
            copy($temporaryPath, $importPath);
        }

        $fastExcel = new FastExcel();
        if (in_array($extension, ['csv', 'txt'], true)) {
            $fastExcel = $fastExcel->configureCsv(',');
        }

        $rows = $fastExcel->import($importPath);

        if ($importPath !== $temporaryPath && file_exists($importPath)) {
            @unlink($importPath);
        }

        $created = [];
        $errors = [];
        $order = $nextOrder > 0 ? $nextOrder : 1;

        foreach ($rows as $index => $row) {
            try {
                if (!is_array($row)) {
                    continue;
                }
                $payload = $this->buildQuestionPayload($row, [
                    'default_type' => $defaultType,
                    'default_points' => $defaultPoints,
                    'order_index' => $order,
                ]);

                if ($payload === null) {
                    continue;
                }

                $question = DB::transaction(function () use ($quiz, $payload) {
                    $options = $payload['options'] ?? null;
                    unset($payload['options']);

                    $question = new Question($payload);
                    $question->quiz_id = $quiz->id;
                    if ($question->type === 'short_desc') {
                        $question->requires_manual_grading = true;
                    }
                    $question->save();

                    if ($options) {
                        $order = 1;
                        foreach ($options as $option) {
                            QuestionOption::create([
                                'question_id' => $question->id,
                                'text' => $option['text'],
                                'is_correct' => $option['is_correct'],
                                'order_index' => $order++,
                            ]);
                        }
                    }

                    return $question->fresh('options');
                });

                $created[] = $question;
                $order++;
            } catch (\Throwable $e) {
                $errors[] = [
                    'row' => $index + 2, // account for header row
                    'message' => $e->getMessage(),
                ];
            }
        }

        return response()->json([
            'created' => count($created),
            'failed' => count($errors),
            'errors' => $errors,
            'questions' => collect($created)->map(fn ($question) => $question->toArray()),
        ]);
    }

    public function generate(GenerateQuizQuestionsRequest $request, Quiz $quiz, AIQuestionGenerator $generator)
    {
        if (!$this->canManageQuiz($request->user(), $quiz)) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        if (!$generator->isConfigured()) {
            return response()->json([
                'message' => 'AI question generation is not configured. Add an OPENAI_API_KEY to enable this feature.'
            ], Response::HTTP_SERVICE_UNAVAILABLE);
        }

        $options = $request->only(['count', 'question_type', 'difficulty']);

        try {
            $generated = $generator->generateFromUpload($request->file('file'), $options);
        } catch (\Throwable $e) {
            return response()->json([
                'message' => 'Failed to generate questions: ' . $e->getMessage(),
            ], Response::HTTP_BAD_REQUEST);
        }

        if (empty($generated)) {
            return response()->json([
                'message' => 'No questions generated from the provided content.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $order = ((int) $quiz->questions()->max('order_index')) + 1;
        $created = [];

        foreach ($generated as $payload) {
            $payload['order_index'] = $order++;
            $options = $payload['options'] ?? null;
            unset($payload['options']);

            $question = DB::transaction(function () use ($quiz, $payload, $options) {
                $question = new Question($payload);
                $question->quiz_id = $quiz->id;
                if ($question->type === 'short_desc') {
                    $question->requires_manual_grading = true;
                }
                $question->save();

                if ($options && $question->type === 'mcq') {
                    $order = 1;
                    foreach ($options as $option) {
                        QuestionOption::create([
                            'question_id' => $question->id,
                            'text' => $option['text'],
                            'is_correct' => $option['is_correct'],
                            'order_index' => $order++,
                        ]);
                    }
                    $question->setRelation('options', $question->options()->get());
                }

                return $question->fresh('options');
            });

            $created[] = $question;
        }

        return response()->json([
            'created' => count($created),
            'questions' => collect($created)->map(fn ($question) => $question->toArray()),
        ], Response::HTTP_CREATED);
    }

    protected function canManageQuiz($user, Quiz $quiz): bool
    {
        if (!$user) {
            return false;
        }

        return $quiz->owner_id === $user->id || $user->hasAnyRole(['admin', 'superadmin']);
    }

    protected function buildQuestionPayload(array $row, array $defaults): ?array
    {
        $type = $this->normalizeType($row['type'] ?? $defaults['default_type'] ?? 'mcq');
        $orderIndex = $defaults['order_index'] ?? 1;
        $points = $this->resolvePoints($row['points'] ?? $row['point'] ?? $defaults['default_points'] ?? 1);
        $explanation = $this->firstNonEmpty($row, ['explanation', 'rationale', 'notes']);

        if ($type === 'mcq') {
            $text = $this->firstNonEmpty($row, ['question', 'text', 'prompt']);
            if (!$text) {
                throw new \InvalidArgumentException('Missing question text for MCQ row.');
            }

            $options = $this->extractOptions($row);
            if (count($options) < 2) {
                throw new \InvalidArgumentException('Provide at least two answer options for MCQ rows.');
            }

            if (!collect($options)->contains(fn ($opt) => $opt['is_correct'])) {
                // default first option to correct to avoid invalid questions
                $options[0]['is_correct'] = true;
            }

            return [
                'type' => 'mcq',
                'order_index' => $orderIndex,
                'text' => $text,
                'points' => $points,
                'multiple_correct' => $this->hasMultipleCorrect($options),
                'explanation' => $explanation,
                'options' => $options,
            ];
        }

        if ($type === 'true_false') {
            $text = $this->firstNonEmpty($row, ['question', 'text']);
            if (!$text) {
                throw new \InvalidArgumentException('Missing question text for true/false row.');
            }

            $correct = $this->extractBoolean($row);

            return [
                'type' => 'true_false',
                'order_index' => $orderIndex,
                'text' => $text,
                'correct_boolean' => $correct,
                'points' => $points,
                'explanation' => $explanation,
            ];
        }

        if ($type === 'short_desc') {
            $prompt = $this->firstNonEmpty($row, ['prompt', 'question', 'text']);
            if (!$prompt) {
                throw new \InvalidArgumentException('Missing prompt for short description row.');
            }

            return [
                'type' => 'short_desc',
                'order_index' => $orderIndex,
                'prompt' => $prompt,
                'sample_answer' => $this->firstNonEmpty($row, ['sample_answer', 'answer', 'model_answer']),
                'points' => $points,
                'requires_manual_grading' => true,
                'explanation' => $explanation,
            ];
        }

        return null;
    }

    protected function normalizeType(string $type): string
    {
        return match (strtolower(trim($type))) {
            'true_false', 'true/false', 'true-false', 'boolean', 'tf' => 'true_false',
            'short_desc', 'short-desc', 'short_answer', 'short-answer', 'open', 'openended' => 'short_desc',
            default => 'mcq',
        };
    }

    protected function resolvePoints($points): int
    {
        $value = (int) filter_var($points, FILTER_SANITIZE_NUMBER_INT);
        return $value > 0 ? $value : 1;
    }

    protected function firstNonEmpty(array $row, array $keys): ?string
    {
        foreach ($keys as $key) {
            foreach ($row as $column => $value) {
                if (strcasecmp($column, $key) === 0) {
                    $string = trim((string) $value);
                    if ($string !== '') {
                        return $string;
                    }
                }
            }
        }

        return null;
    }

    protected function extractOptions(array $row): array
    {
        $options = [];

        $optionsString = $this->firstNonEmpty($row, ['options', 'choices', 'answers']);
        if ($optionsString) {
            $options = $this->parseOptionString($optionsString);
        }

        // Gather columns that look like option columns (e.g., option_1, optionA, option a)
        if (empty($options)) {
            $temp = [];
            foreach ($row as $column => $value) {
                $normalized = strtolower(preg_replace('/[^a-z0-9]/', '', (string) $column));
                if (str_starts_with($normalized, 'option')) {
                    $temp[$normalized] = trim((string) $value);
                }
            }

            ksort($temp);
            foreach ($temp as $value) {
                if ($value !== '') {
                    $options[] = ['text' => $value, 'is_correct' => false];
                }
            }
        }

        if (empty($options)) {
            return [];
        }

        $correctField = $this->firstNonEmpty($row, ['correct_options', 'correct_option', 'correct', 'answer', 'answers', 'correct_answers']);
        if ($correctField) {
            $options = $this->markCorrectOptions($options, $correctField);
        }

        return $options;
    }

    protected function parseOptionString(string $value): array
    {
        $parts = preg_split('/[|;\n]+/', $value) ?: [];
        $options = [];

        foreach ($parts as $part) {
            $text = trim($part);
            if ($text === '') {
                continue;
            }

            $isCorrect = false;
            if (str_starts_with($text, '*')) {
                $isCorrect = true;
                $text = ltrim($text, "* \t");
            }

            $options[] = [
                'text' => $text,
                'is_correct' => $isCorrect,
            ];
        }

        return $options;
    }

    protected function markCorrectOptions(array $options, string $correctField): array
    {
        $tokens = array_filter(array_map('trim', preg_split('/[|,;]+/', strtolower($correctField)) ?: []));

        $indices = [];
        foreach ($tokens as $token) {
            if (is_numeric($token)) {
                $indices[] = (int) $token - 1;
                continue;
            }

            if (strlen($token) === 1 && $token >= 'a' && $token <= 'z') {
                $indices[] = ord($token) - ord('a');
                continue;
            }

            $indices[] = $token;
        }

        foreach ($options as $idx => &$option) {
            $option['is_correct'] = false;
        }

        foreach ($indices as $indicator) {
            if (is_int($indicator) && isset($options[$indicator])) {
                $options[$indicator]['is_correct'] = true;
                continue;
            }

            foreach ($options as &$option) {
                if (is_string($indicator) && strcasecmp($option['text'], $indicator) === 0) {
                    $option['is_correct'] = true;
                }
            }
        }

        return $options;
    }

    protected function extractBoolean(array $row): bool
    {
        $raw = $this->firstNonEmpty($row, ['correct', 'answer', 'correct_boolean', 'correct_answer']);
        if ($raw === null) {
            return true;
        }

        $value = strtolower($raw);
        return in_array($value, ['1', 'true', 't', 'yes', 'y'], true) || $value === 'correct';
    }

    protected function hasMultipleCorrect(array $options): bool
    {
        return collect($options)->filter(fn ($opt) => $opt['is_correct'])->count() > 1;
    }
}
