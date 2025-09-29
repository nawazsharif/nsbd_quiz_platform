<?php

namespace App\Http\Controllers;

use App\Models\AttemptAnswer;
use App\Models\Question;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\QuizEnrollment;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class QuizAttemptController extends Controller
{
    /**
     * Legacy endpoint: start attempt using quiz_id payload.
     */
    public function start(Request $request): JsonResponse
    {
        $request->validate([
            'quiz_id' => 'required|integer|exists:quizzes,id',
            'force_new' => 'sometimes|boolean',
        ]);

        $quiz = Quiz::findOrFail($request->integer('quiz_id'));

        return $this->createAttemptForQuiz($request, $quiz);
    }

    /**
     * REST endpoint: start or reattempt a quiz.
     */
    public function store(Request $request, Quiz $quiz): JsonResponse
    {
        $request->validate([
            'force_new' => 'sometimes|boolean',
        ]);

        return $this->createAttemptForQuiz($request, $quiz);
    }

    /**
     * Resume an existing attempt.
     */
    public function resume(Request $request, QuizAttempt $attempt): JsonResponse
    {
        $user = $request->user();
        if (!$user instanceof User) {
            abort(Response::HTTP_UNAUTHORIZED, 'Unauthenticated.');
        }

        if ($attempt->user_id !== $user->id) {
            abort(Response::HTTP_FORBIDDEN, 'Unauthorized access to quiz attempt');
        }

        if ($attempt->status !== 'in_progress') {
            return response()->json([
                'message' => 'This attempt is no longer active.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $quiz = $attempt->quiz()->with([
            'questions.options' => static fn($query) => $query->orderBy('order_index'),
            'tags',
            'category',
        ])->firstOrFail();

        $this->ensureQuizAccess($user, $quiz);

        $questions = $this->loadQuestions($quiz);

        return response()->json([
            'status' => 'resume',
            'attempt' => $this->transformAttempt($attempt->setRelation('quiz', $quiz), includeQuiz: true),
            'quiz' => $this->transformQuiz($quiz, $questions, false),
        ]);
    }

    /**
     * Update quiz attempt progress.
     */
    public function updateProgress(Request $request, QuizAttempt $attempt): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user instanceof User) {
                abort(Response::HTTP_UNAUTHORIZED, 'Unauthenticated.');
            }
            if ($attempt->user_id !== $user->id || $attempt->status !== 'in_progress') {
                abort(Response::HTTP_FORBIDDEN, 'Failed to update progress');
            }

            $payload = $this->extractProgressPayload($request, $attempt);

            $request->merge($payload);

            $validated = $request->validate([
                'current_question_index' => 'nullable|integer|min:0',
                'time_spent_seconds' => 'nullable|integer|min:0',
                'remaining_time_seconds' => 'nullable|integer|min:0',
                'answers' => 'array',
            ]);

            $incomingAnswers = is_array($validated['answers'] ?? null) ? $validated['answers'] : [];
            $existingAnswers = $attempt->progress['answers'] ?? [];
            if ($existingAnswers instanceof \stdClass) {
                $existingAnswers = (array) $existingAnswers;
            }

            $mergedAnswers = $this->mergeAnswers($existingAnswers, $incomingAnswers);
            $answeredCount = collect($mergedAnswers)->filter(fn($value) => $this->answerProvided($value))->count();
            $totalQuestions = $attempt->total_questions ?? 0;

            $progress = [
                'currentQuestionIndex' => $validated['current_question_index'] ?? $attempt->current_question_index,
                'totalQuestions' => $totalQuestions,
                'answeredQuestions' => $answeredCount,
                'answers' => $this->castAnswersObject($mergedAnswers),
                'timeSpent' => $validated['time_spent_seconds'] ?? $attempt->time_spent_seconds,
                'lastActivityAt' => now()->toIso8601String(),
                'completionPercentage' => $totalQuestions > 0
                    ? round(($answeredCount / $totalQuestions) * 100, 2)
                    : 0,
            ];

            $attempt->update([
                'current_question_index' => $validated['current_question_index'] ?? $attempt->current_question_index,
                'time_spent_seconds' => $validated['time_spent_seconds'] ?? $attempt->time_spent_seconds,
                'remaining_time_seconds' => $validated['remaining_time_seconds'] ?? $attempt->remaining_time_seconds,
                'progress' => $progress,
            ]);

            return response()->json([
                'status' => 'progress_saved',
                'attempt' => $this->transformAttempt($attempt->fresh('quiz'), includeQuiz: true),
            ]);
        } catch (ValidationException $e) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to update progress',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Submit quiz attempt.
     */
    public function submit(Request $request, QuizAttempt $attempt): JsonResponse
    {
        try {
            $user = $request->user();
            if ($attempt->user_id !== $user->id || $attempt->status !== 'in_progress') {
                abort(Response::HTTP_FORBIDDEN, 'Failed to submit quiz');
            }

            $quiz = $attempt->quiz()->with('questions.options')->firstOrFail();

            $payload = $this->extractSubmissionPayload($request);
            $request->merge($payload);

            $request->validate([
                'answers' => 'array',
                'time_spent_seconds' => 'nullable|integer|min:0',
            ]);

            DB::beginTransaction();

            [
                $normalizedAnswers,
                $answersMap,
                $answerStats,
            ] = $this->normalizeAnswers($request->input('answers', []), $quiz);

            AttemptAnswer::where('quiz_attempt_id', $attempt->id)->delete();

            foreach ($normalizedAnswers as $answer) {
                AttemptAnswer::create(array_merge($answer, [
                    'quiz_attempt_id' => $attempt->id,
                ]));
            }

            $pendingCount = $answerStats['pending'];
            $totalPoints = max($answerStats['total_points'], 1);
            $earnedPoints = max(0, $answerStats['earned_points']);
            $penaltyPoints = max(0, $answerStats['penalty_points']);
            $finalScore = max(0, min(100, ($earnedPoints / $totalPoints) * 100));

            // Calculate time spent - use provided value or calculate from start time
            $timeSpent = $request->input('time_spent_seconds');
            if ($timeSpent === null || $timeSpent === '') {
                $timeSpent = $attempt->time_spent_seconds ?? 0;
                // If still null/empty, calculate from start time
                if ($timeSpent === 0 && $attempt->started_at) {
                    $timeSpent = now()->diffInSeconds($attempt->started_at);
                }
            }

            $attempt->update([
                'status' => 'completed',
                'correct_answers' => $answerStats['correct'],
                'incorrect_answers' => $answerStats['incorrect'],
                'score' => round($finalScore, 2),
                'earned_points' => round($earnedPoints, 2),
                'penalty_points' => round($penaltyPoints, 2),
                'time_spent_seconds' => (int) $timeSpent,
                'current_question_index' => $attempt->total_questions,
                'completed_at' => now(),
                'progress' => [
                    'currentQuestionIndex' => $attempt->total_questions,
                    'totalQuestions' => $attempt->total_questions,
                    'answeredQuestions' => count(array_filter($answersMap, static fn($value) => $value !== null && $value !== '')),
                    'answers' => $this->castAnswersObject($answersMap),
                    'timeSpent' => (int) $timeSpent,
                    'lastActivityAt' => now()->toIso8601String(),
                    'completionPercentage' => $attempt->total_questions > 0
                        ? round((($answerStats['correct'] + $answerStats['incorrect'] + $pendingCount) / $attempt->total_questions) * 100, 2)
                        : 0,
                ],
            ]);

            DB::commit();

            $attempt->refresh()->load(['quiz' => fn($query) => $query->with(['tags', 'category'])]);
            $questions = $this->loadQuestions($quiz);

            return response()->json([
                'status' => 'completed',
                'attempt' => $this->transformAttempt($attempt, includeQuiz: true, includeAnswers: true),
                'results' => [
                    'score' => round($finalScore, 2),
                    'maxScore' => $answerStats['total_points'],
                    'correctAnswers' => $answerStats['correct'],
                    'incorrectAnswers' => $answerStats['incorrect'],
                    'pendingAnswers' => $pendingCount,
                    'completionPercentage' => $attempt->total_questions > 0
                        ? round((($answerStats['correct'] + $answerStats['incorrect'] + $pendingCount) / $attempt->total_questions) * 100, 2)
                        : 0,
                    'timeSpent' => $attempt->time_spent_seconds,
                ],
                'quiz' => $this->transformQuiz($quiz->setRelation('questions', $questions), $questions, true),
                'answers' => $this->castAnswersObject($answersMap),
            ]);
        } catch (ValidationException $e) {
            DB::rollBack();
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $e->errors(),
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Failed to submit quiz attempt', [
                'attempt_id' => $attempt->id,
                'user_id' => $user->id,
                'error' => $e->getMessage(),
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to submit quiz',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Abandon an attempt.
     */
    public function abandon(Request $request, QuizAttempt $attempt): JsonResponse
    {
        try {
            $user = $request->user();
            if ($attempt->user_id !== $user->id) {
                abort(Response::HTTP_FORBIDDEN, 'Failed to abandon attempt');
            }

            if ($attempt->status === 'in_progress') {
                $attempt->markAsAbandoned();
            }

            return response()->json([
                'status' => 'abandoned',
                'attempt' => $this->transformAttempt($attempt->fresh('quiz'), includeQuiz: true),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to abandon attempt',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get attempts for authenticated user.
     */
    public function getUserAttempts(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user instanceof User) {
                $user = Auth::user();
            }
            if (!$user instanceof User) {
                abort(Response::HTTP_UNAUTHORIZED, 'Unauthenticated.');
            }

            $query = QuizAttempt::with('quiz')
                ->where('user_id', $user->id)
                ->orderByDesc('created_at');

            if ($request->filled('quiz_id')) {
                $query->where('quiz_id', $request->integer('quiz_id'));
            }

            if ($request->filled('status')) {
                $query->where('status', $request->input('status'));
            }

            $perPage = (int) $request->get('per_page', 15);

            $paginator = $query->paginate($perPage);

            $collection = $paginator->getCollection()->map(fn(QuizAttempt $attempt) => $this->transformAttemptSummary($attempt));

            $meta = [
                'current_page' => $paginator->currentPage(),
                'per_page' => $paginator->perPage(),
                'total' => $paginator->total(),
                'last_page' => $paginator->lastPage(),
            ];

            return response()->json([
                'attempts' => $collection->values(),
                'data' => $collection->values(),
                'meta' => $meta,
                'links' => [
                    'next' => $paginator->nextPageUrl(),
                    'prev' => $paginator->previousPageUrl(),
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch attempts',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Attempt statistics for authenticated user.
     */
    public function getAttemptStatistics(Request $request): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user instanceof User) {
                $user = Auth::user();
            }
            if (!$user instanceof User) {
                abort(Response::HTTP_UNAUTHORIZED, 'Unauthenticated.');
            }
            $quizId = $request->filled('quiz_id') ? (int) $request->input('quiz_id') : null;

            $baseQuery = QuizAttempt::where('user_id', $user->id);
            if ($quizId) {
                $baseQuery->where('quiz_id', $quizId);
            }

            $totalAttempts = (clone $baseQuery)->count();
            $completedAttempts = (clone $baseQuery)->where('status', 'completed')->count();

            $averageScore = (clone $baseQuery)
                ->where('status', 'completed')
                ->avg('score') ?? 0;

            $bestScore = (clone $baseQuery)
                ->where('status', 'completed')
                ->max('score') ?? 0;

            $totalTimeSpent = (clone $baseQuery)
                ->where('status', 'completed')
                ->sum('time_spent_seconds') ?? 0;

            $recentAttempts = (clone $baseQuery)
                ->with('quiz')
                ->where('status', 'completed')
                ->orderByDesc('completed_at')
                ->limit(10)
                ->get()
                ->map(fn(QuizAttempt $attempt) => $this->transformAttemptSummary($attempt));

            return response()->json([
                'totalAttempts' => $totalAttempts,
                'completedAttempts' => $completedAttempts,
                'completionRate' => $totalAttempts > 0 ? round(($completedAttempts / $totalAttempts) * 100, 2) : 0,
                'averageScore' => round($averageScore, 2),
                'bestScore' => round($bestScore, 2),
                'totalTimeSpent' => (int) $totalTimeSpent,
                'recentAttempts' => $recentAttempts,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch statistics',
            ], Response::HTTP_INTERNAL_SERVER_ERROR);
        }
    }

    /**
     * Get single attempt details.
     */
    public function getAttempt(Request $request, QuizAttempt $attempt): JsonResponse
    {
        try {
            $user = $request->user();
            if (!$user instanceof User) {
                $user = Auth::user();
            }
            if (!$user instanceof User) {
                abort(Response::HTTP_UNAUTHORIZED, 'Unauthenticated.');
            }
            if ($attempt->user_id !== $user->id) {
                abort(Response::HTTP_FORBIDDEN, 'Failed to fetch attempt');
            }

            $quiz = $attempt->quiz()->with([
                'questions.options' => static fn($query) => $query->orderBy('order_index'),
                'tags',
                'category',
            ])->firstOrFail();
            $questions = $this->loadQuestions($quiz);

            $answers = $attempt->progress['answers'] ?? [];
            if ($answers instanceof \stdClass) {
                $answers = (array) $answers;
            }

            $includeCorrectness = $attempt->status === 'completed' || $this->canBypassAvailability($user, $quiz);

            return response()->json([
                'attempt' => $this->transformAttempt($attempt->setRelation('quiz', $quiz), includeQuiz: true, includeAnswers: true),
                'quiz' => $this->transformQuiz($quiz, $questions, $includeCorrectness),
                'answers' => $this->castAnswersObject($answers),
                'results' => [
                    'score' => $attempt->score !== null ? (float) $attempt->score : null,
                    'correctAnswers' => (int) $attempt->correct_answers,
                    'incorrectAnswers' => (int) $attempt->incorrect_answers,
                    'pendingAnswers' => $questions->filter(static fn($question) => (bool) $question->requires_manual_grading)->count(),
                    'timeSpent' => (int) $attempt->time_spent_seconds,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch attempt',
            ], Response::HTTP_NOT_FOUND);
        }
    }

    /**
     * Internal: create or reuse an attempt for the given quiz.
     */
    private function createAttemptForQuiz(Request $request, Quiz $quiz): JsonResponse
    {
        $user = $request->user();
        if (!$user instanceof User) {
            abort(Response::HTTP_UNAUTHORIZED, 'Unauthenticated.');
        }

        $forceNew = $request->boolean('force_new');

        $this->ensureQuizAccess($user, $quiz);

        $canBypassAvailability = $this->canBypassAvailability($user, $quiz);
        if ($quiz->status !== 'published' && !$canBypassAvailability) {
            return response()->json([
                'message' => 'Quiz is not available',
            ], Response::HTTP_FORBIDDEN);
        }

        $quiz->loadMissing([
            'questions.options' => static fn($query) => $query->orderBy('order_index'),
            'tags',
            'category',
        ]);

        $questions = $this->loadQuestions($quiz);

        $activeAttempt = QuizAttempt::where('user_id', $user->id)
            ->where('quiz_id', $quiz->id)
            ->where('status', 'in_progress')
            ->first();

        if ($activeAttempt && !$forceNew) {
            return response()->json([
                'status' => 'resume',
                'message' => 'You already have an active attempt for this quiz.',
                'attempt' => $this->transformAttempt($activeAttempt->setRelation('quiz', $quiz), includeQuiz: true),
                'quiz' => $this->transformQuiz($quiz, $questions, false),
            ]);
        }

        if ($forceNew && $activeAttempt) {
            $activeAttempt->markAsAbandoned();
        }

        if (!$this->canStartAttempt($user, $quiz, $forceNew)) {
            return response()->json([
                'message' => 'You have reached the maximum number of attempts for this quiz.',
            ], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $attempt = $this->initializeAttempt($user->id, $quiz, $questions);

        return response()->json([
            'status' => 'created',
            'attempt' => $this->transformAttempt($attempt->setRelation('quiz', $quiz), includeQuiz: true),
            'quiz' => $this->transformQuiz($quiz, $questions, false),
        ], Response::HTTP_CREATED);
    }

    private function ensureQuizAccess(User $user, Quiz $quiz): void
    {
        if ($quiz->owner_id === $user->id || $user->hasAnyRole(['admin', 'superadmin'])) {
            return;
        }

        if (!QuizEnrollment::isEnrolled($user->id, $quiz->id)) {
            abort(Response::HTTP_FORBIDDEN, 'You need to enroll in this quiz before attempting it.');
        }
    }

    private function canBypassAvailability(User $user, Quiz $quiz): bool
    {
        return $quiz->owner_id === $user->id || $user->hasAnyRole(['admin', 'superadmin']);
    }

    private function canStartAttempt(User $user, Quiz $quiz, bool $forceNew): bool
    {
        if ($this->canBypassAvailability($user, $quiz)) {
            return true;
        }

        if (!$quiz->allow_multiple_attempts && !$forceNew) {
            $hasCompleted = QuizAttempt::where('user_id', $user->id)
                ->where('quiz_id', $quiz->id)
                ->where('status', 'completed')
                ->exists();

            if ($hasCompleted) {
                return false;
            }
        }

        if ($quiz->max_attempts !== null) {
            $completedCount = QuizAttempt::where('user_id', $user->id)
                ->where('quiz_id', $quiz->id)
                ->where('status', 'completed')
                ->count();

            if ($completedCount >= $quiz->max_attempts) {
                return false;
            }
        }

        return true;
    }

    private function initializeAttempt(int $userId, Quiz $quiz, Collection $questions): QuizAttempt
    {
        return QuizAttempt::create([
            'user_id' => $userId,
            'quiz_id' => $quiz->id,
            'status' => 'in_progress',
            'current_question_index' => 0,
            'score' => 0,
            'earned_points' => 0,
            'penalty_points' => 0,
            'correct_answers' => 0,
            'incorrect_answers' => 0,
            'total_questions' => $questions->count(),
            'time_spent_seconds' => 0,
            'remaining_time_seconds' => $quiz->timer_seconds,
            'progress' => [
                'currentQuestionIndex' => 0,
                'totalQuestions' => $questions->count(),
                'answeredQuestions' => 0,
                'answers' => new \stdClass(),
                'timeSpent' => 0,
                'lastActivityAt' => now()->toIso8601String(),
                'completionPercentage' => 0,
            ],
            'started_at' => now(),
        ]);
    }

    private function loadQuestions(Quiz $quiz): Collection
    {
        return $quiz->questions()->with(['options' => function ($query) {
            $query->orderBy('order_index');
        }])->orderBy('order_index')->get();
    }

    private function mergeAnswers(array $existing, array $incoming): array
    {
        $merged = $existing;

        foreach ($incoming as $key => $value) {
            $merged[(string) $key] = $value;
        }

        return $merged;
    }

    private function answerProvided($value): bool
    {
        if (is_array($value)) {
            return collect($value)->filter(static fn($item) => $item !== null && $item !== '')->isNotEmpty();
        }

        return $value !== null && $value !== '';
    }

    private function castAnswersObject(array $answers)
    {
        $normalized = [];
        foreach ($answers as $key => $value) {
            $normalized[(string) $key] = $value;
        }

        return empty($normalized) ? new \stdClass() : (object) $normalized;
    }

    private function transformQuiz(Quiz $quiz, ?Collection $questions = null, bool $includeCorrectness = false): array
    {
        $quizData = [
            'id' => $quiz->id,
            'title' => $quiz->title,
            'description' => $quiz->description,
            'difficulty' => $quiz->difficulty,
            'timer_seconds' => $quiz->timer_seconds,
            'negative_marking' => (bool) ($quiz->negative_marking ?? false),
            'negative_mark_value' => $quiz->negative_mark_value !== null ? (float) $quiz->negative_mark_value : null,
            'allow_multiple_attempts' => (bool) ($quiz->allow_multiple_attempts ?? false),
            'max_attempts' => $quiz->max_attempts !== null ? (int) $quiz->max_attempts : null,
            'visibility' => $quiz->visibility,
        ];

        if ($quiz->relationLoaded('category') && $quiz->category) {
            $quizData['category'] = [
                'id' => $quiz->category->id,
                'name' => $quiz->category->name,
                'slug' => $quiz->category->slug,
            ];
        }

        if ($quiz->relationLoaded('tags')) {
            $quizData['tags'] = $quiz->tags->map(fn($tag) => [
                'id' => $tag->id,
                'name' => $tag->name,
                'slug' => $tag->slug,
            ])->values();
        }

        if ($questions) {
            $quizData['questions'] = $questions->map(fn(Question $question) => $this->transformQuestion($question, $includeCorrectness))->values();
        }

        return $quizData;
    }

    private function transformQuestion(Question $question, bool $includeCorrectness): array
    {
        $question->loadMissing(['options' => fn($query) => $query->orderBy('order_index')]);

        $options = $question->relationLoaded('options')
            ? $question->options->sortBy('order_index')->values()->map(function ($option, $index) use ($includeCorrectness) {
                $payload = [
                    'id' => $option->id,
                    'text' => $option->text,
                    'order_index' => $option->order_index ?? $index,
                ];

                if ($includeCorrectness) {
                    $payload['is_correct'] = (bool) $option->is_correct;
                }

                return $payload;
            })
            : collect();

        return [
            'id' => $question->id,
            'type' => $question->type,
            'order_index' => $question->order_index,
            'text' => $question->text,
            'prompt' => $question->prompt,
            'explanation' => $question->explanation,
            'multiple_correct' => (bool) ($question->multiple_correct ?? false),
            'requires_manual_grading' => (bool) ($question->requires_manual_grading ?? false),
            'correct_boolean' => $question->correct_boolean !== null ? (bool) $question->correct_boolean : null,
            'points' => $question->points !== null ? (int) $question->points : 1,
            'options' => $options->values(),
        ];
    }

    private function extractProgressPayload(Request $request, QuizAttempt $attempt): array
    {
        $currentIndex = $request->input('current_question_index', $request->input('currentQuestionIndex', $attempt->current_question_index));
        $timeSpent = $request->input('time_spent_seconds', $request->input('timeSpent', $attempt->time_spent_seconds));
        $remaining = $request->input('remaining_time_seconds', $attempt->remaining_time_seconds);
        $answers = $request->input('answers', $attempt->progress['answers'] ?? []);

        if (!is_array($answers)) {
            if ($answers instanceof \stdClass) {
                $answers = (array) $answers;
            } else {
                $answers = [];
            }
        }

        return [
            'current_question_index' => max(0, (int) $currentIndex),
            'time_spent_seconds' => $timeSpent !== null ? max(0, (int) $timeSpent) : null,
            'remaining_time_seconds' => $remaining !== null ? max(0, (int) $remaining) : null,
            'answers' => $answers,
        ];
    }

    private function extractSubmissionPayload(Request $request): array
    {
        $answers = $request->input('answers', []);
        if (!is_array($answers)) {
            if ($answers instanceof \stdClass) {
                $answers = (array) $answers;
            } else {
                $answers = [];
            }
        }

        return [
            'answers' => $answers,
            'time_spent_seconds' => $request->input('time_spent_seconds', $request->input('timeSpent')),
        ];
    }

    private function normalizeAnswers(array $incoming, Quiz $quiz): array
    {
        $questions = $quiz->questions;
        $questionMap = $questions->keyBy(fn($question) => (string) $question->id);

        $normalized = [];
        $answersMap = [];
        $correct = 0;
        $incorrect = 0;
        $pending = 0;
        $earnedPoints = 0;
        $penaltyPoints = 0;
        $totalPoints = 0;

        foreach ($questionMap as $key => $question) {
            $questionValue = $incoming[$key] ?? $incoming[$question->id] ?? null;
            if ($questionValue instanceof \stdClass) {
                $questionValue = (array) $questionValue;
            }
            $answersMap[$key] = $questionValue;

            $questionPoints = (int) ($question->points ?? 1);
            $totalPoints += $questionPoints;

            $options = $question->options->sortBy('order_index')->values();

            if ($question->type === 'short_desc' || $question->requires_manual_grading) {
                $pending++;
                $normalized[] = [
                    'question_id' => $question->id,
                    'selected_option_id' => null,
                    'answer_text' => $questionValue !== null ? (string) $questionValue : null,
                    'is_correct' => false,
                    'time_spent_seconds' => 0,
                ];
                continue;
            }

            if ($question->type === 'true_false') {
                $isCorrect = $questionValue !== null ? ((bool) $questionValue === (bool) $question->correct_boolean) : false;
                $normalized[] = [
                    'question_id' => $question->id,
                    'selected_option_id' => null,
                    'answer_text' => $questionValue === null ? null : ($questionValue ? 'true' : 'false'),
                    'is_correct' => $isCorrect,
                    'time_spent_seconds' => 0,
                ];

                if ($questionValue === null) {
                    $incorrect++;
                } elseif ($isCorrect) {
                    $correct++;
                    $earnedPoints += $questionPoints;
                } else {
                    $incorrect++;
                    $penaltyPoints += $quiz->negative_marking ? (float) $quiz->negative_mark_value : 0;
                }

                continue;
            }

            if ($question->type === 'mcq') {
                if ($question->multiple_correct) {
                    $selectedIndexes = collect($questionValue ?? [])->map(fn($v) => (int) $v)->filter(fn($v) => $v >= 0)->unique()->values();
                    $selectedOptionIds = $selectedIndexes->map(fn($index) => $options[$index]->id ?? null)->filter()->values()->all();

                    $correctOptionIds = $options->filter(fn($option) => $option->is_correct)->pluck('id')->sort()->values()->all();
                    $isCorrect = !array_diff($correctOptionIds, $selectedOptionIds) && !array_diff($selectedOptionIds, $correctOptionIds);

                    $normalized[] = [
                        'question_id' => $question->id,
                        'selected_option_id' => null,
                        'answer_text' => !empty($selectedOptionIds) ? json_encode($selectedOptionIds) : null,
                        'is_correct' => $isCorrect,
                        'time_spent_seconds' => 0,
                    ];

                    if ($selectedIndexes->isEmpty()) {
                        $incorrect++;
                    } elseif ($isCorrect) {
                        $correct++;
                        $earnedPoints += $questionPoints;
                    } else {
                        $incorrect++;
                        $penaltyPoints += $quiz->negative_marking ? (float) $quiz->negative_mark_value : 0;
                    }
                } else {
                    $selectedIndex = $questionValue !== null ? (int) $questionValue : null;
                    $selectedOption = $selectedIndex !== null ? ($options[$selectedIndex] ?? null) : null;
                    $isCorrect = $selectedOption ? (bool) $selectedOption->is_correct : false;

                    $normalized[] = [
                        'question_id' => $question->id,
                        'selected_option_id' => $selectedOption?->id,
                        'answer_text' => $selectedOption?->id ? null : json_encode([$selectedIndex]),
                        'is_correct' => $isCorrect,
                        'time_spent_seconds' => 0,
                    ];

                    if ($selectedOption === null) {
                        $incorrect++;
                    } elseif ($isCorrect) {
                        $correct++;
                        $earnedPoints += $questionPoints;
                    } else {
                        $incorrect++;
                        $penaltyPoints += $quiz->negative_marking ? (float) $quiz->negative_mark_value : 0;
                    }
                }

                continue;
            }

            $normalized[] = [
                'question_id' => $question->id,
                'selected_option_id' => null,
                'answer_text' => $questionValue !== null ? (string) $questionValue : null,
                'is_correct' => false,
                'time_spent_seconds' => 0,
            ];
            $incorrect++;
        }

        return [
            $normalized,
            $answersMap,
            [
                'correct' => $correct,
                'incorrect' => $incorrect,
                'pending' => $pending,
                'earned_points' => $earnedPoints,
                'penalty_points' => $penaltyPoints,
                'total_points' => $totalPoints,
            ],
        ];
    }

    private function transformAttempt(QuizAttempt $attempt, bool $includeQuiz = false, bool $includeAnswers = false): array
    {
        if ($includeQuiz && !$attempt->relationLoaded('quiz')) {
            $attempt->load('quiz');
        }

        $progress = $attempt->progress ?? [];
        $answers = $progress['answers'] ?? [];
        if ($answers instanceof \stdClass) {
            $answers = (array) $answers;
        }

        $answeredQuestions = $progress['answeredQuestions'] ?? collect($answers)->filter(fn($value) => $this->answerProvided($value))->count();

        $data = [
            'id' => (string) $attempt->id,
            'quiz_id' => $attempt->quiz_id,
            'user_id' => $attempt->user_id,
            'status' => $attempt->status,
            'current_question_index' => $attempt->current_question_index,
            'total_questions' => $attempt->total_questions,
            'score' => $attempt->score !== null ? (float) $attempt->score : null,
            'earned_points' => $attempt->earned_points !== null ? (float) $attempt->earned_points : null,
            'penalty_points' => $attempt->penalty_points !== null ? (float) $attempt->penalty_points : null,
            'correct_answers' => $attempt->correct_answers,
            'incorrect_answers' => $attempt->incorrect_answers,
            'time_spent_seconds' => $attempt->time_spent_seconds,
            'remaining_time_seconds' => $attempt->remaining_time_seconds,
            'started_at' => optional($attempt->started_at)->toIso8601String(),
            'completed_at' => optional($attempt->completed_at)->toIso8601String(),
            'created_at' => optional($attempt->created_at)->toIso8601String(),
            'updated_at' => optional($attempt->updated_at)->toIso8601String(),
            'progress' => [
                'currentQuestionIndex' => $progress['currentQuestionIndex'] ?? $attempt->current_question_index,
                'totalQuestions' => $progress['totalQuestions'] ?? $attempt->total_questions,
                'answeredQuestions' => $answeredQuestions,
                'answers' => $this->castAnswersObject($answers),
                'timeSpent' => $progress['timeSpent'] ?? $attempt->time_spent_seconds,
                'lastActivityAt' => $progress['lastActivityAt'] ?? optional($attempt->updated_at)->toIso8601String(),
                'completionPercentage' => $progress['completionPercentage'] ?? ($attempt->total_questions > 0
                    ? round((($attempt->correct_answers + $attempt->incorrect_answers) / max(1, $attempt->total_questions)) * 100, 2)
                    : 0),
            ],
        ];

        if ($includeAnswers) {
            $data['answers'] = $this->castAnswersObject($answers);
        }

        if ($includeQuiz && $attempt->relationLoaded('quiz') && $attempt->quiz) {
            $quiz = $attempt->quiz;
            $data['quiz'] = [
                'id' => $quiz->id,
                'title' => $quiz->title,
                'description' => $quiz->description,
                'difficulty' => $quiz->difficulty,
                'timer_seconds' => $quiz->timer_seconds,
            ];
        }

        return $data;
    }

    private function transformAttemptSummary(QuizAttempt $attempt): array
    {
        $quiz = $attempt->quiz;
        $progress = $attempt->progress ?? [];
        $pending = $quiz?->questions?->where('requires_manual_grading', true)->count() ?? 0;

        return [
            'id' => (string) $attempt->id,
            'quiz_id' => $attempt->quiz_id,
            'quiz_title' => $quiz?->title,
            'status' => $attempt->status,
            'score' => $attempt->score !== null ? (float) $attempt->score : null,
            'max_score' => $quiz?->questions?->sum(fn($question) => (int) ($question->points ?? 1)) ?? 0,
            'completion_percentage' => $progress['completionPercentage'] ?? ($attempt->total_questions > 0
                ? round((($attempt->correct_answers + $attempt->incorrect_answers + $pending) / $attempt->total_questions) * 100, 2)
                : 0),
            'time_spent_seconds' => $attempt->time_spent_seconds,
            'correct_answers' => $attempt->correct_answers,
            'incorrect_answers' => $attempt->incorrect_answers,
            'started_at' => optional($attempt->started_at)->toIso8601String(),
            'completed_at' => optional($attempt->completed_at)->toIso8601String(),
            'difficulty' => $quiz?->difficulty,
        ];
    }
}
