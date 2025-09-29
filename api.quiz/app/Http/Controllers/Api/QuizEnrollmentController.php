<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Quiz;
use App\Models\QuizEnrollment;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Tag(
 *     name="Quiz Enrollments",
 *     description="API endpoints for quiz enrollment status checking"
 * )
 */
class QuizEnrollmentController extends Controller
{
    /**
     * Get all quiz enrollments for the authenticated user.
     *
     * @OA\Get(
     *     path="/api/quiz-enrollments",
     *     tags={"Quiz Enrollments"},
     *     summary="Get user's quiz enrollments",
     *     security={{"sanctum":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="List of quiz enrollments",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="data", type="array", @OA\Items(type="object"))
     *         )
     *     )
     * )
     */
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $enrollments = QuizEnrollment::with(['quiz.category', 'quiz.owner'])
            ->where('user_id', $user->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json([
            'data' => $enrollments->map(function ($enrollment) {
                return [
                    'id' => $enrollment->id,
                    'quiz' => [
                        'id' => $enrollment->quiz->id,
                        'title' => $enrollment->quiz->title,
                        'description' => $enrollment->quiz->description,
                        'difficulty' => $enrollment->quiz->difficulty,
                        'is_paid' => $enrollment->quiz->is_paid,
                        'price_cents' => $enrollment->quiz->price_cents,
                        'timer_seconds' => $enrollment->quiz->timer_seconds,
                        'status' => $enrollment->quiz->status,
                        'category' => $enrollment->quiz->category ? [
                            'id' => $enrollment->quiz->category->id,
                            'name' => $enrollment->quiz->category->name
                        ] : null,
                        'owner' => [
                            'id' => $enrollment->quiz->owner->id,
                            'name' => $enrollment->quiz->owner->name
                        ]
                    ],
                    'enrolled_at' => $enrollment->created_at,
                    'access_type' => 'enrolled'
                ];
            })
        ]);
    }

    /**
     * Check enrollment status for a quiz.
     *
     * @OA\Get(
     *     path="/api/quizzes/{quiz}/enrollment-status",
     *     tags={"Quiz Enrollments"},
     *     summary="Check if user is enrolled in quiz",
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(
     *         name="quiz",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Enrollment status",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="enrolled", type="boolean"),
     *             @OA\Property(property="enrollment", type="object", nullable=true)
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Quiz not found"
     *     )
     * )
     */
    public function checkEnrollment(Request $request, Quiz $quiz): JsonResponse
    {
        $user = $request->user();

        // Check if user is quiz owner, admin, or superadmin - they have automatic access
        if ($quiz->owner_id === $user->id || $user->hasAnyRole(['admin', 'superadmin'])) {
            return response()->json([
                'enrolled' => true,
                'enrollment' => [
                    'id' => null, // No enrollment record needed for owners/admins
                    'enrolled_at' => null,
                    'access_type' => $quiz->owner_id === $user->id ? 'owner' : 'admin'
                ]
            ]);
        }

        $enrollment = QuizEnrollment::where('user_id', $user->id)
            ->where('quiz_id', $quiz->id)
            ->first();

        if ($enrollment) {
            return response()->json([
                'enrolled' => true,
                'enrollment' => [
                    'id' => $enrollment->id,
                    'enrolled_at' => $enrollment->created_at,
                    'access_type' => 'enrolled'
                ]
            ]);
        }

        return response()->json([
            'enrolled' => false,
            'enrollment' => null,
        ]);
    }
}
