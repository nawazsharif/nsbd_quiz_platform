<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\CourseReview;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * @OA\Tag(name="Course Reviews", description="Reviews for courses (free and paid)")
 *
 * @OA\Schema(
 *   schema="CourseReview",
 *   type="object",
 *   @OA\Property(property="id", type="integer"),
 *   @OA\Property(property="course_id", type="integer"),
 *   @OA\Property(property="user_id", type="integer"),
 *   @OA\Property(property="rating", type="integer", minimum=1, maximum=5),
 *   @OA\Property(property="comment", type="string", nullable=true),
 *   @OA\Property(property="is_hidden", type="boolean"),
 *   @OA\Property(property="created_at", type="string", format="date-time"),
 *   @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
class CourseReviewController extends Controller
{
    /**
     * @OA\Get(path="/api/courses/{course}/reviews", tags={"Course Reviews"}, summary="List course reviews", security={},
     *   @OA\Parameter(name="course", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function index(Request $request, Course $course)
    {
        $perPage = (int) $request->get('per_page', 15);
        $reviews = CourseReview::where('course_id', $course->id)
            ->where('is_hidden', false)
            ->orderByDesc('created_at')
            ->paginate($perPage);
        return response()->json($reviews);
    }

    /**
     * @OA\Post(path="/api/courses/{course}/reviews", tags={"Course Reviews"}, summary="Create course review (enrolled users)",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="course", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\RequestBody(@OA\JsonContent(required={"rating"}, @OA\Property(property="rating", type="integer", minimum=1, maximum=5), @OA\Property(property="comment", type="string"))),
     *   @OA\Response(response=201, description="Created")
     * )
     */
    public function store(Request $request, Course $course)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], Response::HTTP_UNAUTHORIZED);
        }
        if ($course->owner_id === $user->id) {
            return response()->json(['message' => 'You cannot review your own course'], Response::HTTP_FORBIDDEN);
        }

        // Enrollment requirement for both paid and free. For free courses, auto-enroll for convenience.
        $enrolled = CourseEnrollment::where('course_id', $course->id)->where('user_id', $user->id)->exists();
        if (!$enrolled) {
            if ($course->is_paid) {
                return response()->json(['message' => 'Purchase required to review this course'], Response::HTTP_FORBIDDEN);
            }
            // Auto-enroll for free course
            CourseEnrollment::firstOrCreate(['course_id' => $course->id, 'user_id' => $user->id]);
        }

        $data = $request->validate([
            'rating' => 'required|integer|min:1|max:5',
            'comment' => 'nullable|string|min:10',
        ]);

        if (CourseReview::where('course_id', $course->id)->where('user_id', $user->id)->exists()) {
            return response()->json(['message' => 'You have already reviewed this course'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        $review = CourseReview::create([
            'course_id' => $course->id,
            'user_id' => $user->id,
            'rating' => $data['rating'],
            'comment' => $data['comment'] ?? null,
        ]);

        $course->recalcRating();
        return response()->json($review, Response::HTTP_CREATED);
    }

    /**
     * @OA\Put(path="/api/courses/{course}/reviews/{review}", tags={"Course Reviews"}, summary="Update own course review",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="course", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Parameter(name="review", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\RequestBody(@OA\JsonContent(@OA\Property(property="rating", type="integer", minimum=1, maximum=5), @OA\Property(property="comment", type="string"))),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function update(Request $request, Course $course, CourseReview $review)
    {
        $user = $request->user();
        if (!$user || $review->user_id !== $user->id) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        if ($review->course_id !== $course->id) {
            return response()->json(['message' => 'Invalid review'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        $data = $request->validate([
            'rating' => 'nullable|integer|min:1|max:5',
            'comment' => 'nullable|string|min:10',
        ]);
        $review->fill(array_filter($data, fn($v) => !is_null($v)));
        $review->save();
        $course->recalcRating();
        return response()->json($review);
    }

    /**
     * @OA\Delete(path="/api/courses/{course}/reviews/{review}", tags={"Course Reviews"}, summary="Delete own or admin course review",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="course", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Parameter(name="review", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=204, description="No Content")
     * )
     */
    public function destroy(Request $request, Course $course, CourseReview $review)
    {
        $user = $request->user();
        $isAdmin = $user && $user->hasAnyRole(['admin', 'superadmin']);
        if (!$user || ($review->user_id !== $user->id && !$isAdmin)) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        if ($review->course_id !== $course->id) {
            return response()->json(['message' => 'Invalid review'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        $review->delete();
        $course->recalcRating();
        return response()->json(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * @OA\Post(path="/api/course-reviews/{review}/hide", tags={"Course Reviews"}, summary="Hide/Unhide course review (superadmin)",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="review", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\RequestBody(@OA\JsonContent(required={"hidden"}, @OA\Property(property="hidden", type="boolean"))),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function hide(Request $request, CourseReview $review)
    {
        $user = $request->user();
        if (!$user || !$user->hasRole('superadmin')) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        $data = $request->validate(['hidden' => 'required|boolean']);
        $review->is_hidden = (bool) $data['hidden'];
        $review->save();
        $course = $review->course;
        if ($course) {
            $course->recalcRating();
        }
        return response()->json($review);
    }
}

