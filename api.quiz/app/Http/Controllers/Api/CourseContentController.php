<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCourseContentRequest;
use App\Http\Requests\UpdateCourseContentRequest;
use App\Models\Course;
use App\Models\CourseContent;
use App\Models\CourseEnrollment;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * @OA\Tag(name="Course Contents", description="Manage course contents")
 */
class CourseContentController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * @OA\Get(path="/api/courses/{course}/contents", tags={"Course Contents"}, summary="List contents", security={{"sanctum":{}}},
     *   @OA\Parameter(name="course", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function index(Request $request, Course $course)
    {
        $user = $request->user();
        
        // Allow access if user is:
        // 1. Course owner
        // 2. Admin or superadmin
        // 3. Enrolled in the course
        if (!$user || (
            $course->owner_id !== $user->id && 
            !$user->hasAnyRole(['admin', 'superadmin']) && 
            !CourseEnrollment::isEnrolled($user->id, $course->id)
        )) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        
        $contents = CourseContent::where('course_id', $course->id)->orderBy('order_index')->get();
        return response()->json($contents);
    }

    /**
     * @OA\Post(path="/api/courses/{course}/contents", tags={"Course Contents"}, summary="Create content", security={{"sanctum":{}}},
     *   @OA\Parameter(name="course", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\RequestBody(@OA\JsonContent(
     *     required={"type","title"},
     *     @OA\Property(property="type", type="string", enum={"pdf","text","video","quiz","certificate"}),
     *     @OA\Property(property="title", type="string"),
     *     @OA\Property(property="order_index", type="integer"),
     *     @OA\Property(property="duration_seconds", type="integer"),
     *     @OA\Property(property="payload", type="object")
     *   )),
     *   @OA\Response(response=201, description="Created")
     * )
     */
    public function store(StoreCourseContentRequest $request, Course $course)
    {
        $this->authorizeOwner($request, $course);
        $data = $request->validated();
        $data['course_id'] = $course->id;
        $content = CourseContent::create($data);
        return response()->json($content, Response::HTTP_CREATED);
    }

    /**
     * @OA\Get(path="/api/courses/{course}/contents/{content}", tags={"Course Contents"}, summary="Show content", security={{"sanctum":{}}},
     *   @OA\Parameter(name="course", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Parameter(name="content", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function show(Request $request, Course $course, CourseContent $content)
    {
        $this->authorizeOwner($request, $course);
        if ($content->course_id !== $course->id) {
            return response()->json(['message' => 'Invalid content'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        return response()->json($content);
    }

    /**
     * @OA\Put(path="/api/courses/{course}/contents/{content}", tags={"Course Contents"}, summary="Update content", security={{"sanctum":{}}},
     *   @OA\Parameter(name="course", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Parameter(name="content", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\RequestBody(@OA\JsonContent()),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function update(UpdateCourseContentRequest $request, Course $course, CourseContent $content)
    {
        $this->authorizeOwner($request, $course);
        if ($content->course_id !== $course->id) {
            return response()->json(['message' => 'Invalid content'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        $data = $request->validated();
        $content->update($data);
        return response()->json($content);
    }

    /**
     * @OA\Delete(path="/api/courses/{course}/contents/{content}", tags={"Course Contents"}, summary="Delete content", security={{"sanctum":{}}},
     *   @OA\Parameter(name="course", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Parameter(name="content", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=204, description="No Content")
     * )
     */
    public function destroy(Request $request, Course $course, CourseContent $content)
    {
        $this->authorizeOwner($request, $course);
        if ($content->course_id !== $course->id) {
            return response()->json(['message' => 'Invalid content'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        $content->delete();
        return response()->json(null, Response::HTTP_NO_CONTENT);
    }

    private function authorizeOwner(Request $request, Course $course): void
    {
        $user = $request->user();
        abort_if(!$user || ($course->owner_id !== $user->id && !$user->hasAnyRole(['admin','superadmin'])), Response::HTTP_FORBIDDEN, 'Forbidden');
    }
}

