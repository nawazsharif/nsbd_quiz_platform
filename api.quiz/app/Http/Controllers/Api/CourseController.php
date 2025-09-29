<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreCourseRequest;
use App\Http\Requests\UpdateCourseRequest;
use App\Models\Course;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

/**
 * @OA\Tag(name="Courses", description="Course management")
 *
 * @OA\Schema(
 *   schema="Course",
 *   type="object",
 *   @OA\Property(property="id", type="integer"),
 *   @OA\Property(property="owner_id", type="integer"),
 *   @OA\Property(property="title", type="string"),
 *   @OA\Property(property="slug", type="string"),
 *   @OA\Property(property="summary", type="string"),
 *   @OA\Property(property="description", type="string"),
 *   @OA\Property(property="cover_url", type="string"),
 *   @OA\Property(property="is_paid", type="boolean"),
 *   @OA\Property(property="price_cents", type="integer", nullable=true),
 *   @OA\Property(property="visibility", type="string", enum={"public","private"}),
 *   @OA\Property(property="status", type="string", enum={"draft","submitted","approved","rejected"}),
 *   @OA\Property(property="rating_avg", type="number", format="float"),
 *   @OA\Property(property="rating_count", type="integer"),
 *   @OA\Property(property="created_at", type="string", format="date-time"),
 *   @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 */
class CourseController extends Controller
{
    public function __construct()
    {
        // Auth required for write actions
        $this->middleware('auth:sanctum')->only(['store', 'update', 'destroy', 'submit']);
    }

    /**
     * @OA\Get(path="/api/courses", tags={"Courses"}, summary="List courses", security={},
     *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer")),
     *   @OA\Parameter(name="status", in="query", @OA\Schema(type="string")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->get('per_page', 15);
        $query = Course::query();
        $status = $request->get('status');
        if ($status) {
            $query->where('status', $status);
        } else {
            // Public defaults to approved
            $query->where('status', 'approved');
        }
        $courses = $query->orderByDesc('created_at')->paginate($perPage);
        return response()->json($courses);
    }

    /**
     * @OA\Get(path="/api/courses/{course}", tags={"Courses"}, summary="Show course", security={},
     *   @OA\Parameter(name="course", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function show(Course $course)
    {
        return response()->json($course);
    }

    /**
     * @OA\Post(path="/api/courses", tags={"Courses"}, summary="Create course", security={{"sanctum":{}}},
     *   @OA\RequestBody(@OA\JsonContent(ref="#/components/schemas/Course")),
     *   @OA\Response(response=201, description="Created")
     * )
     */
    public function store(StoreCourseRequest $request)
    {
        $data = $request->validated();
        $data['owner_id'] = $request->user()->id;
        $data['slug'] = Str::slug(($data['title'] ?? 'course').'-'.uniqid());
        $course = Course::create($data);
        return response()->json($course, Response::HTTP_CREATED);
    }

    /**
     * @OA\Put(path="/api/courses/{course}", tags={"Courses"}, summary="Update course", security={{"sanctum":{}}},
     *   @OA\Parameter(name="course", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\RequestBody(@OA\JsonContent(ref="#/components/schemas/Course")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function update(UpdateCourseRequest $request, Course $course)
    {
        $user = $request->user();
        if ($course->owner_id !== $user->id && !$user->hasAnyRole(['admin','superadmin'])) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        $data = $request->validated();

        // Business rule: prevent creators from changing pricing after approval
        if ($course->status === 'approved' && !$user->hasAnyRole(['admin','superadmin'])) {
            if (array_key_exists('is_paid', $data) || array_key_exists('price_cents', $data)) {
                return response()->json([
                    'message' => 'Pricing cannot be changed after approval. Please contact an admin to update pricing.',
                ], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
        }

        $course->update($data);
        return response()->json($course);
    }

    /**
     * @OA\Delete(path="/api/courses/{course}", tags={"Courses"}, summary="Delete course", security={{"sanctum":{}}},
     *   @OA\Parameter(name="course", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=204, description="No Content")
     * )
     */
    public function destroy(Request $request, Course $course)
    {
        $user = $request->user();
        if ($course->owner_id !== $user->id && !$user->hasAnyRole(['admin','superadmin'])) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        $course->delete();
        return response()->json(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * @OA\Post(path="/api/courses/{course}/submit", tags={"Courses"}, summary="Submit for approval", security={{"sanctum":{}}},
     *   @OA\Parameter(name="course", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function submit(Request $request, Course $course)
    {
        $user = $request->user();
        if ($course->owner_id !== $user->id && !$user->hasAnyRole(['admin', 'superadmin'])) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        if ($course->status === 'approved') {
            return response()->json(['message' => 'Already approved'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }

        // Set status to submitted for review
        $course->status = 'submitted';
        $course->save();
        return response()->json($course);
    }
}
