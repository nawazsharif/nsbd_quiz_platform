<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\CourseProgress;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

/**
 * @OA\Tag(
 *     name="Course Enrollments",
 *     description="API endpoints for course enrollment and progress tracking"
 * )
 */
class CourseEnrollmentController extends Controller
{
    /**
     * Get user's course enrollments with progress.
     *
     * @OA\Get(
     *     path="/api/course-enrollments",
     *     tags={"Course Enrollments"},
     *     summary="Get user's course enrollments",
     *     security={{"sanctum":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="List of user's course enrollments",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="data", type="array", @OA\Items(
     *                 type="object",
     *                 @OA\Property(property="id", type="integer"),
     *                 @OA\Property(property="course", type="object"),
     *                 @OA\Property(property="progress", type="object"),
     *                 @OA\Property(property="enrolled_at", type="string", format="date-time")
     *             ))
     *         )
     *     )
     * )
     */
    public function index(Request $request): JsonResponse
    {
        $enrollments = CourseEnrollment::with('course')
            ->where('user_id', $request->user()->id)
            ->get()
            ->map(function ($enrollment) {
                return [
                    'id' => $enrollment->id,
                    'course' => $enrollment->course,
                    'progress' => $enrollment->getProgressData(),
                    'enrolled_at' => $enrollment->created_at,
                ];
            });

        return response()->json(['data' => $enrollments]);
    }

    /**
     * Enroll in a course.
     *
     * @OA\Post(
     *     path="/api/courses/{course}/enroll",
     *     tags={"Course Enrollments"},
     *     summary="Enroll in a course",
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(
     *         name="course",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successfully enrolled",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="message", type="string"),
     *             @OA\Property(property="enrollment", type="object")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Already enrolled or course not available"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Course not found"
     *     )
     * )
     */
    public function enroll(Request $request, Course $course): JsonResponse
    {
        // Check if course is available for enrollment
        if ($course->status !== 'approved') {
            return response()->json([
                'message' => 'Course is not available for enrollment'
            ], 400);
        }

        // Check if already enrolled
        if (CourseEnrollment::isEnrolled($request->user()->id, $course->id)) {
            return response()->json([
                'message' => 'Already enrolled in this course'
            ], 400);
        }

        // For paid courses, you might want to check payment here
        // This is a simplified version - in production you'd handle payments

        $enrollment = CourseEnrollment::enroll($request->user()->id, $course->id);

        return response()->json([
            'message' => 'Successfully enrolled in course',
            'enrollment' => [
                'id' => $enrollment->id,
                'course' => $course,
                'progress' => $enrollment->getProgressData(),
                'enrolled_at' => $enrollment->created_at,
            ]
        ]);
    }

    /**
     * Get course progress for the current user.
     *
     * @OA\Get(
     *     path="/api/courses/{course}/progress",
     *     tags={"Course Enrollments"},
     *     summary="Get course progress",
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(
     *         name="course",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Course progress data",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="progress", type="object"),
     *             @OA\Property(property="content_progress", type="array", @OA\Items(type="object"))
     *         )
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Not enrolled in course"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Course not found"
     *     )
     * )
     */
    public function getProgress(Request $request, Course $course): JsonResponse
    {
        // Check if user is enrolled
        if (!CourseEnrollment::isEnrolled($request->user()->id, $course->id)) {
            return response()->json([
                'message' => 'Not enrolled in this course'
            ], 403);
        }

        $overallProgress = CourseProgress::getCourseProgress($request->user()->id, $course->id);
        
        $contentProgress = CourseProgress::with('courseContent')
            ->where('user_id', $request->user()->id)
            ->where('course_id', $course->id)
            ->get()
            ->map(function ($progress) {
                return [
                    'content_id' => $progress->course_content_id,
                    'content' => $progress->courseContent,
                    'status' => $progress->status,
                    'progress_percentage' => $progress->progress_percentage,
                    'started_at' => $progress->started_at,
                    'completed_at' => $progress->completed_at,
                    'last_activity_at' => $progress->last_activity_at,
                ];
            });

        return response()->json([
            'progress' => $overallProgress,
            'content_progress' => $contentProgress,
        ]);
    }

    /**
     * Update progress for a specific course content.
     *
     * @OA\Post(
     *     path="/api/courses/{course}/content/{content}/progress",
     *     tags={"Course Enrollments"},
     *     summary="Update content progress",
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(
     *         name="course",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Parameter(
     *         name="content",
     *         in="path",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="progress_percentage", type="integer", minimum=0, maximum=100),
     *             @OA\Property(property="status", type="string", enum={"not_started", "in_progress", "completed"})
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Progress updated successfully",
     *         @OA\JsonContent(
     *             type="object",
     *             @OA\Property(property="message", type="string"),
     *             @OA\Property(property="progress", type="object")
     *         )
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Not enrolled in course"
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Course or content not found"
     *     )
     * )
     */
    public function updateProgress(Request $request, Course $course, int $contentId): JsonResponse
    {
        // Check if user is enrolled
        if (!CourseEnrollment::isEnrolled($request->user()->id, $course->id)) {
            return response()->json([
                'message' => 'Not enrolled in this course'
            ], 403);
        }

        $request->validate([
            'progress_percentage' => 'sometimes|integer|min:0|max:100',
            'status' => 'sometimes|string|in:not_started,in_progress,completed',
        ]);

        // Find or create progress record
        $progress = CourseProgress::firstOrCreate([
            'user_id' => $request->user()->id,
            'course_id' => $course->id,
            'course_content_id' => $contentId,
        ]);

        // Update progress based on request
        if ($request->has('progress_percentage')) {
            $progress->updateProgress($request->progress_percentage);
        } elseif ($request->has('status')) {
            switch ($request->status) {
                case 'in_progress':
                    $progress->markAsStarted();
                    break;
                case 'completed':
                    $progress->markAsCompleted();
                    break;
            }
        }

        return response()->json([
            'message' => 'Progress updated successfully',
            'progress' => [
                'content_id' => $progress->course_content_id,
                'status' => $progress->status,
                'progress_percentage' => $progress->progress_percentage,
                'started_at' => $progress->started_at,
                'completed_at' => $progress->completed_at,
                'last_activity_at' => $progress->last_activity_at,
            ]
        ]);
    }

    /**
     * Check enrollment status for a course.
     *
     * @OA\Get(
     *     path="/api/courses/{course}/enrollment-status",
     *     tags={"Course Enrollments"},
     *     summary="Check if user is enrolled in course",
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(
     *         name="course",
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
     *         description="Course not found"
     *     )
     * )
     */
    public function checkEnrollment(Request $request, Course $course): JsonResponse
    {
        $user = $request->user();
        
        // Check if user is course owner, admin, or superadmin - they have automatic access
        if ($course->owner_id === $user->id || $user->hasAnyRole(['admin', 'superadmin'])) {
            return response()->json([
                'enrolled' => true,
                'enrollment' => [
                    'id' => null, // No enrollment record needed for owners/admins
                    'progress' => null, // Progress tracking not applicable for owners/admins
                    'enrolled_at' => null,
                    'access_type' => $course->owner_id === $user->id ? 'owner' : 'admin'
                ]
            ]);
        }

        $enrollment = CourseEnrollment::where('user_id', $user->id)
            ->where('course_id', $course->id)
            ->first();

        if ($enrollment) {
            return response()->json([
                'enrolled' => true,
                'enrollment' => [
                    'id' => $enrollment->id,
                    'progress' => $enrollment->getProgressData(),
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