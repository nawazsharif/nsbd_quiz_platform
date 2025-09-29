<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Quiz;
use App\Models\QuizBookmark;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * @OA\Tag(name="Bookmarks", description="Quiz bookmark management")
 *
 * @OA\Schema(
 *   schema="QuizBookmark",
 *   type="object",
 *   @OA\Property(property="id", type="integer"),
 *   @OA\Property(property="user_id", type="integer"),
 *   @OA\Property(property="quiz_id", type="integer"),
 *   @OA\Property(property="created_at", type="string", format="date-time"),
 *   @OA\Property(property="updated_at", type="string", format="date-time"),
 *   @OA\Property(property="quiz", ref="#/components/schemas/Quiz")
 * )
 */
class BookmarkController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Display a listing of the user's bookmarked quizzes.
     *
     * @OA\Get(
     *     path="/api/bookmarks",
     *     tags={"Bookmarks"},
     *     summary="Get user's bookmarked quizzes",
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(
     *         name="per_page",
     *         in="query",
     *         @OA\Schema(type="integer", default=15)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="List of bookmarked quizzes",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/QuizBookmark"))
     *         )
     *     )
     * )
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->get('per_page', 15);
        
        $bookmarks = QuizBookmark::with(['quiz' => function ($query) {
            $query->with(['owner', 'category'])
                  ->withCount('questions')
                  ->select(['id', 'owner_id', 'category_id', 'title', 'description', 'difficulty', 'is_paid', 'price_cents', 'rating_avg', 'rating_count', 'status', 'visibility', 'created_at']);
        }])
        ->where('user_id', $request->user()->id)
        ->orderBy('created_at', 'desc')
        ->paginate($perPage);

        return response()->json($bookmarks);
    }

    /**
     * Toggle bookmark status for a quiz.
     *
     * @OA\Post(
     *     path="/api/bookmarks/toggle/{quiz}",
     *     tags={"Bookmarks"},
     *     summary="Toggle bookmark for a quiz",
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(
     *         name="quiz",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Bookmark toggled successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="bookmarked", type="boolean"),
     *             @OA\Property(property="message", type="string")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Quiz not found"
     *     )
     * )
     */
    public function toggle(Request $request, Quiz $quiz)
    {
        $result = QuizBookmark::toggle($request->user()->id, $quiz->id);
        
        return response()->json($result);
    }

    /**
     * Check if a quiz is bookmarked by the current user.
     *
     * @OA\Get(
     *     path="/api/bookmarks/check/{quiz}",
     *     tags={"Bookmarks"},
     *     summary="Check if quiz is bookmarked",
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(
     *         name="quiz",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Bookmark status",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="bookmarked", type="boolean")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Quiz not found"
     *     )
     * )
     */
    public function check(Request $request, Quiz $quiz)
    {
        $bookmarked = QuizBookmark::isBookmarked($request->user()->id, $quiz->id);
        
        return response()->json(['bookmarked' => $bookmarked]);
    }

    /**
     * Remove a bookmark.
     *
     * @OA\Delete(
     *     path="/api/bookmarks/{quiz}",
     *     tags={"Bookmarks"},
     *     summary="Remove bookmark for a quiz",
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(
     *         name="quiz",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Bookmark removed successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="message", type="string")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Quiz not found or not bookmarked"
     *     )
     * )
     */
    public function destroy(Request $request, Quiz $quiz)
    {
        $bookmark = QuizBookmark::where('user_id', $request->user()->id)
            ->where('quiz_id', $quiz->id)
            ->first();

        if (!$bookmark) {
            return response()->json(['message' => 'Bookmark not found'], Response::HTTP_NOT_FOUND);
        }

        $bookmark->delete();

        return response()->json(['message' => 'Bookmark removed successfully']);
    }
}