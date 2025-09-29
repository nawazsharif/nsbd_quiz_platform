<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Quiz;
use App\Models\QuizEnrollment;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * @OA\Tag(name="Reviews", description="Quiz reviews (paid quizzes only)")
 *
 * @OA\Schema(
 *   schema="Review",
 *   type="object",
 *   @OA\Property(property="id", type="integer"),
 *   @OA\Property(property="quiz_id", type="integer"),
 *   @OA\Property(property="user_id", type="integer"),
 *   @OA\Property(property="rating", type="integer", minimum=1, maximum=5),
 *   @OA\Property(property="comment", type="string", nullable=true),
 *   @OA\Property(property="is_hidden", type="boolean"),
 *   @OA\Property(property="created_at", type="string", format="date-time"),
 *   @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
class ReviewController extends Controller
{
    /**
     * @OA\Get(path="/api/quizzes/{quiz}/reviews", tags={"Reviews"}, summary="List reviews (public)", security={},
     *   @OA\Parameter(name="quiz", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function index(Request $request, Quiz $quiz)
    {
        $perPage = (int) $request->get('per_page', 15);
        $reviews = Review::where('quiz_id', $quiz->id)
            ->where('is_hidden', false)
            ->orderByDesc('created_at')
            ->paginate($perPage);
        return response()->json($reviews);
    }

    /**
     * @OA\Post(path="/api/quizzes/{quiz}/reviews", tags={"Reviews"}, summary="Create review (paid purchasers only)",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="quiz", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\RequestBody(@OA\JsonContent(required={"rating"}, @OA\Property(property="rating", type="integer", minimum=1, maximum=5), @OA\Property(property="comment", type="string"))),
     *   @OA\Response(response=201, description="Created")
     * )
     */
    public function store(Request $request, Quiz $quiz)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }
        if (!$quiz->is_paid) {
            return response()->json(['message' => 'Reviews are only allowed for paid quizzes'], Response::HTTP_FORBIDDEN);
        }
        if ($quiz->owner_id === $user->id) {
            return response()->json(['message' => 'You cannot review your own quiz'], Response::HTTP_FORBIDDEN);
        }
        $enrolled = QuizEnrollment::where('quiz_id', $quiz->id)->where('user_id', $user->id)->exists();
        if (!$enrolled) {
            return response()->json(['message' => 'Purchase required to review this quiz'], Response::HTTP_FORBIDDEN);
        }

        $data = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|min:10',
        ]);

        // Ensure single review per user
        if (Review::where('quiz_id', $quiz->id)->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'You have already reviewed this quiz'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $review = Review::create([
            'quiz_id' => $quiz->id,
            'user_id' => $user->id,
            'rating' => $data['rating'],
            'comment' => $data['comment'] ?? null,
        ]);

        // Update aggregates
        $quiz->recalcRating();

        return response()->json($review, Response::HTTP_CREATED);
    }

    /**
     * @OA\Put(path="/api/quizzes/{quiz}/reviews/{review}", tags={"Reviews"}, summary="Update own review",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="quiz", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Parameter(name="review", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\RequestBody(@OA\JsonContent(@OA\Property(property="rating", type="integer", minimum=1, maximum=5), @OA\Property(property="comment", type="string"))),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function update(Request $request, Quiz $quiz, Review $review)
    {
        $user = $request->user();
        if (!$user || $review->user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        if ($review->quiz_id !== $quiz->id) {
            return response()->json(['message' => 'Invalid review'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        $data = $request->validate([
            'rating' => 'nullable|integer|min:1|max:5',
            'comment' => 'nullable|string|min:10',
        ]);
        $review->fill(array_filter($data, fn($v) => !is_null($v)));
        $review->save();

        $quiz->recalcRating();

        return response()->json($review);
    }

    /**
     * @OA\Delete(path="/api/quizzes/{quiz}/reviews/{review}", tags={"Reviews"}, summary="Delete own review or admin delete",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="quiz", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Parameter(name="review", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=204, description="No Content")
     * )
     */
    public function destroy(Request $request, Quiz $quiz, Review $review)
    {
        $user = $request->user();
        $isAdmin = $user && $user->hasAnyRole(['admin', 'superadmin']);
        if (!$user || ($review->user_id !== $user->id && !$isAdmin)) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        if ($review->quiz_id !== $quiz->id) {
            return response()->json(['message' => 'Invalid review'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        $review->delete();
        $quiz->recalcRating();
        return response()->json(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * @OA\Post(path="/api/reviews/{review}/hide", tags={"Reviews"}, summary="Hide/Unhide review (superadmin)",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="review", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\RequestBody(@OA\JsonContent(required={"hidden"}, @OA\Property(property="hidden", type="boolean"))),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function hide(Request $request, Review $review)
    {
        $user = $request->user();
        if (!$user || !$user->hasRole('superadmin')) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        $data = $request->validate([
            'hidden' => 'required|boolean',
        ]);
        $review->is_hidden = (bool) $data['hidden'];
        $review->save();

        // Update aggregates on its quiz
        $quiz = $review->quiz;
        if ($quiz) {
            $quiz->recalcRating();
        }

        return response()->json($review);
    }
}

