<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseBookmark;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * @OA\Tag(name="Course Bookmarks", description="Course bookmark management")
 *
 * @OA\Schema(
 *   schema="CourseBookmark",
 *   type="object",
 *   @OA\Property(property="id", type="integer"),
 *   @OA\Property(property="user_id", type="integer"),
 *   @OA\Property(property="course_id", type="integer"),
 *   @OA\Property(property="created_at", type="string", format="date-time"),
 *   @OA\Property(property="updated_at", type="string", format="date-time"),
 *   @OA\Property(property="course", ref="#/components/schemas/Course")
 * )
 */
class CourseBookmarkController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * Display a listing of the user's bookmarked courses.
     *
     * @OA\Get(
     *     path="/api/course-bookmarks",
     *     tags={"Course Bookmarks"},
     *     summary="Get user's bookmarked courses",
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(
     *         name="per_page",
     *         in="query",
     *         @OA\Schema(type="integer", default=15)
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="List of bookmarked courses",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/CourseBookmark"))
     *         )
     *     )
     * )
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->get('per_page', 15);
        
        $bookmarks = CourseBookmark::with(['course' => function ($query) {
            $query->with(['owner'])
                  ->select(['id', 'owner_id', 'category_id', 'title', 'summary', 'description', 'cover_url', 'is_paid', 'price_cents', 'rating_avg', 'rating_count', 'status', 'visibility', 'created_at']);
        }])
        ->where('user_id', $request->user()->id)
        ->orderBy('created_at', 'desc')
        ->paginate($perPage);

        return response()->json($bookmarks);
    }

    /**
     * Toggle bookmark status for a course.
     *
     * @OA\Post(
     *     path="/api/course-bookmarks/toggle/{course}",
     *     tags={"Course Bookmarks"},
     *     summary="Toggle bookmark for a course",
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(
     *         name="course",
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
     *         description="Course not found"
     *     )
     * )
     */
    public function toggle(Request $request, Course $course)
    {
        $result = CourseBookmark::toggle($request->user()->id, $course->id);
        
        return response()->json($result);
    }

    /**
     * Check if a course is bookmarked by the current user.
     *
     * @OA\Get(
     *     path="/api/course-bookmarks/check/{course}",
     *     tags={"Course Bookmarks"},
     *     summary="Check if course is bookmarked",
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(
     *         name="course",
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
     *         description="Course not found"
     *     )
     * )
     */
    public function check(Request $request, Course $course)
    {
        $bookmarked = CourseBookmark::isBookmarked($request->user()->id, $course->id);
        
        return response()->json(['bookmarked' => $bookmarked]);
    }

    /**
     * Remove a bookmark.
     *
     * @OA\Delete(
     *     path="/api/course-bookmarks/{course}",
     *     tags={"Course Bookmarks"},
     *     summary="Remove bookmark for a course",
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(
     *         name="course",
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
     *         description="Course not found or not bookmarked"
     *     )
     * )
     */
    public function destroy(Request $request, Course $course)
    {
        $bookmark = CourseBookmark::where('user_id', $request->user()->id)
            ->where('course_id', $course->id)
            ->first();

        if (!$bookmark) {
            return response()->json(['message' => 'Bookmark not found'], Response::HTTP_NOT_FOUND);
        }

        $bookmark->delete();

        return response()->json(['message' => 'Bookmark removed successfully']);
    }
}