<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Tag(
 *     name="Quiz Rankings",
 *     description="API endpoints for quiz rankings and leaderboards"
 * )
 */
class QuizRankingController extends Controller
{
    /**
     * Get quiz ranking/leaderboard for a specific quiz.
     *
     * @OA\Get(
     *     path="/api/quizzes/{quiz}/ranking",
     *     tags={"Quiz Rankings"},
     *     summary="Get quiz ranking/leaderboard",
     *     @OA\Parameter(
     *         name="quiz",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="limit",
     *         in="query",
     *         required=false,
     *         @OA\Schema(type="integer", default=50)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Quiz ranking data",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="quiz", type="object"),
     *             @OA\Property(property="ranking", type="array", @OA\Items(type="object")),
     *             @OA\Property(property="total_participants", type="integer"),
     *             @OA\Property(property="user_rank", type="object", nullable=true)
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Quiz not found"
     *     )
     * )
     */
    public function getQuizRanking(Request $request, Quiz $quiz): JsonResponse
    {
        $limit = min((int) $request->query('limit', 50), 100); // Max 100 results

        $user = null;
        if ($request->hasHeader('Authorization')) {
            $token = str_replace('Bearer ', '', $request->header('Authorization'));
            $user = \Laravel\Sanctum\PersonalAccessToken::findToken($token)?->tokenable;
        }

        // Get all completed attempts and then filter to get only the best attempt per user
        $allAttempts = QuizAttempt::with('user')
            ->where('quiz_id', $quiz->id)
            ->where('status', 'completed')
            ->orderByDesc('score')
            ->orderBy('time_spent_seconds')
            ->orderBy('completed_at')
            ->get();

        // Group by user and get the best attempt for each user
        $completedAttempts = $allAttempts
            ->groupBy('user_id')
            ->map(function ($userAttempts) {
                // Return the first attempt (best score, fastest time, latest completion)
                return $userAttempts->first();
            })
            ->values()
            ->sortBy([
                ['score', 'desc'],
                ['time_spent_seconds', 'asc'],
                ['completed_at', 'desc']
            ])
            ->values();

        $ranking = [];
        $currentRank = 0;
        $previousScore = null;
        $previousTime = null;

        foreach ($completedAttempts as $index => $attempt) {
            $scoreValue = (float) ($attempt->score ?? 0);
            $timeValue = $attempt->time_spent_seconds ?? PHP_INT_MAX;

            if ($previousScore === null || $scoreValue !== $previousScore || $timeValue !== $previousTime) {
                $currentRank = $index + 1;
                $previousScore = $scoreValue;
                $previousTime = $timeValue;
            }

            $ranking[] = [
                'rank' => $currentRank,
                'user' => [
                    'id' => $attempt->user->id,
                    'name' => $attempt->user->name,
                    'email' => $attempt->user->email,
                ],
                'score' => $scoreValue,
                'result' => $scoreValue >= 60 ? 'Pass' : 'Fail',
                'correct_answers' => $attempt->correct_answers ?? 0,
                'total_questions' => $attempt->total_questions ?? 0,
                'incorrect_answers' => $attempt->incorrect_answers ?? max(0, ($attempt->total_questions ?? 0) - ($attempt->correct_answers ?? 0)),
                'time_spent_seconds' => $attempt->time_spent_seconds ?? 0,
                'time_spent_formatted' => $this->formatTime($attempt->time_spent_seconds ?? 0),
                'completed_at' => $attempt->completed_at,
                'status' => 'Completed',
            ];
        }

        $participantCount = count($ranking);
        $limitedRanking = array_slice($ranking, 0, $limit);

        $userRank = null;
        if ($user) {
            $userRank = collect($ranking)->first(fn (array $entry) => $entry['user']['id'] === $user->id);
        }

        return response()->json([
            'quiz' => [
                'id' => $quiz->id,
                'title' => $quiz->title,
                'description' => $quiz->description,
                'difficulty' => $quiz->difficulty,
                'total_questions' => $quiz->questions()->count(),
                'timer_seconds' => $quiz->timer_seconds,
            ],
            'ranking' => $limitedRanking,
            'total_participants' => $participantCount,
            'user_rank' => $userRank,
            'stats' => [
                'average_score' => $participantCount > 0 ? round(array_sum(array_column($ranking, 'score')) / $participantCount, 2) : 0,
                'highest_score' => $participantCount > 0 ? max(array_column($ranking, 'score')) : 0,
                'lowest_score' => $participantCount > 0 ? min(array_column($ranking, 'score')) : 0,
                'pass_rate' => $participantCount > 0 ? round((count(array_filter($ranking, fn($r) => $r['score'] >= 60)) / $participantCount) * 100, 2) : 0,
            ]
        ]);
    }

    /**
     * Get user's ranking across all quizzes.
     *
     * @OA\Get(
     *     path="/api/user/quiz-rankings",
     *     tags={"Quiz Rankings"},
     *     summary="Get user's quiz rankings",
     *     security={{"sanctum":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="User's quiz rankings",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="data", type="array", @OA\Items(type="object"))
     *         )
     *     )
     * )
     */
    public function getUserRankings(Request $request): JsonResponse
    {
        $user = $request->user();

        // Get user's completed attempts with ranking info
        $attempts = QuizAttempt::with(['quiz.category'])
            ->where('user_id', $user->id)
            ->where('status', 'completed')
            ->whereNotNull('score')
            ->orderBy('completed_at', 'desc')
            ->get();

        $rankings = [];

        foreach ($attempts as $attempt) {
            // Calculate user's rank in this quiz
            $betterAttempts = QuizAttempt::where('quiz_id', $attempt->quiz_id)
                ->where('status', 'completed')
                ->whereNotNull('score')
                ->where(function ($query) use ($attempt) {
                    $query->where('score', '>', $attempt->score)
                        ->orWhere(function ($q) use ($attempt) {
                            $q->where('score', $attempt->score)
                                ->where('time_spent_seconds', '<', $attempt->time_spent_seconds);
                        })
                        ->orWhere(function ($q) use ($attempt) {
                            $q->where('score', $attempt->score)
                                ->where('time_spent_seconds', $attempt->time_spent_seconds)
                                ->where('completed_at', '<', $attempt->completed_at);
                        });
                })
                ->count();

            $rank = $betterAttempts + 1;

            $rankings[] = [
                'quiz' => [
                    'id' => $attempt->quiz->id,
                    'title' => $attempt->quiz->title,
                    'difficulty' => $attempt->quiz->difficulty,
                    'category' => $attempt->quiz->category ? [
                        'id' => $attempt->quiz->category->id,
                        'name' => $attempt->quiz->category->name
                    ] : null,
                ],
                'rank' => $rank,
                'score' => $attempt->score,
                'correct_answers' => $attempt->correct_answers,
                'total_questions' => $attempt->total_questions,
                'time_spent_seconds' => $attempt->time_spent_seconds,
                'time_spent_formatted' => $this->formatTime($attempt->time_spent_seconds),
                'completed_at' => $attempt->completed_at,
                'status' => $attempt->score >= 60 ? 'Pass' : 'Fail'
            ];
        }

        return response()->json(['data' => $rankings]);
    }

    /**
     * Format time in seconds to human readable format.
     */
    private function formatTime(int $seconds): string
    {
        if ($seconds < 60) {
            return "{$seconds} seconds";
        }

        $minutes = floor($seconds / 60);
        $remainingSeconds = $seconds % 60;

        if ($minutes < 60) {
            return $remainingSeconds > 0
                ? "{$minutes} minutes {$remainingSeconds} seconds"
                : "{$minutes} minutes";
        }

        $hours = floor($minutes / 60);
        $remainingMinutes = $minutes % 60;

        return $remainingMinutes > 0
            ? "{$hours} hours {$remainingMinutes} minutes"
            : "{$hours} hours";
    }
}
