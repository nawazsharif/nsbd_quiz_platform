<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreQuizRequest;
use App\Http\Requests\UpdateQuizRequest;
use App\Models\Quiz;
use App\Models\Tag;
use Illuminate\Http\Response;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

/**
 * @OA\Tag(name="Quizzes", description="Quiz management")
 *
 * @OA\Schema(
 *   schema="Quiz",
 *   type="object",
 *   @OA\Property(property="id", type="integer"),
 *   @OA\Property(property="owner_id", type="integer"),
 *   @OA\Property(property="category_id", type="integer", nullable=true),
 *   @OA\Property(property="title", type="string"),
 *   @OA\Property(property="description", type="string"),
 *   @OA\Property(property="difficulty", type="string", enum={"easy","medium","hard"}),
 *   @OA\Property(property="is_paid", type="boolean"),
 *   @OA\Property(property="price_cents", type="integer", nullable=true),
 *   @OA\Property(property="timer_seconds", type="integer", nullable=true),
 *   @OA\Property(property="randomize_questions", type="boolean"),
 *   @OA\Property(property="randomize_answers", type="boolean"),
 *   @OA\Property(property="allow_multiple_attempts", type="boolean"),
 *   @OA\Property(property="max_attempts", type="integer", nullable=true),
 *   @OA\Property(property="visibility", type="string", enum={"public","private"}),
 *   @OA\Property(property="status", type="string", enum={"draft","published"}),
 *   @OA\Property(property="negative_marking", type="boolean"),
 *   @OA\Property(property="negative_mark_value", type="number", format="float", nullable=true),
 *   @OA\Property(property="tags", type="array", @OA\Items(ref="#/components/schemas/Tag")),
 *   @OA\Property(property="created_at", type="string", format="date-time"),
 *   @OA\Property(property="updated_at", type="string", format="date-time")
 * )
 *
 * @OA\Schema(
 *   schema="Tag",
 *   type="object",
 *   @OA\Property(property="id", type="integer"),
 *   @OA\Property(property="name", type="string"),
 *   @OA\Property(property="slug", type="string"),
 * )
 */
class QuizController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum')->only(['store', 'update', 'destroy']);
    }
    /**
     * Display a listing of the resource.
     */
    /**
     * @OA\Get(path="/api/quizzes", tags={"Quizzes"}, summary="List quizzes", security={},
     *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function index(Request $request)
    {
        $perPage = (int) $request->get('per_page', 15);
        $user = $request->user();

        $quizzes = Quiz::with(['tags', 'category'])
            ->withCount('questions')
            ->when(
                !$user || !$user->hasAnyRole(['admin', 'superadmin']),
                function ($query) use ($user) {
                    if (!$user) {
                        $query->where('status', 'published')->where('visibility', 'public');
                    } else {
                        $query->where(function ($inner) use ($user) {
                            $inner->where(function ($published) {
                                $published->where('status', 'published')->where('visibility', 'public');
                            })->orWhere('owner_id', $user->id);
                        });
                    }
                }
            )
            ->orderByDesc('created_at')
            ->paginate($perPage);

        return response()->json($quizzes);
    }

    /**
     * Store a newly created resource in storage.
     */
    /**
     * @OA\Post(path="/api/quizzes", tags={"Quizzes"}, summary="Create quiz", security={{"sanctum":{}}},
     *   @OA\RequestBody(
     *     @OA\JsonContent(
     *       required={"title"},
     *       @OA\Property(property="title", type="string", example="Algebra Fundamentals"),
     *       @OA\Property(property="description", type="string", nullable=true),
     *       @OA\Property(property="category_id", type="integer", nullable=true),
     *       @OA\Property(property="difficulty", type="string", enum={"easy","medium","hard"}, example="medium"),
     *       @OA\Property(property="is_paid", type="boolean", example=false),
     *       @OA\Property(property="price_cents", type="integer", nullable=true, example=0),
     *       @OA\Property(property="timer_seconds", type="integer", nullable=true, example=900),
     *       @OA\Property(property="randomize_questions", type="boolean", example=true),
     *       @OA\Property(property="randomize_answers", type="boolean", example=false),
     *       @OA\Property(property="allow_multiple_attempts", type="boolean", example=true),
     *       @OA\Property(property="max_attempts", type="integer", nullable=true, example=3),
     *       @OA\Property(property="visibility", type="string", enum={"public","private"}, example="public"),
     *       @OA\Property(property="negative_marking", type="boolean", example=true),
     *       @OA\Property(property="negative_mark_value", type="number", format="float", nullable=true, example=0.5),
     *       @OA\Property(property="tags", type="array", @OA\Items(type="string"), example={"math","assessment"})
     *     )
     *   ),
     *   @OA\Response(response=201, description="Created")
     * )
     */
    public function store(StoreQuizRequest $request)
    {
        $data = $request->validated();
        $data['owner_id'] = $request->user()->id;

        if (array_key_exists('negative_marking', $data) && !$data['negative_marking']) {
            $data['negative_mark_value'] = null;
        }

        $tags = $data['tags'] ?? [];
        unset($data['tags']);

        $quiz = Quiz::create($data);

        if (!empty($tags)) {
            $quiz->tags()->sync($this->resolveTagIds($tags));
        }

        return response()->json($quiz->load(['tags', 'category']), Response::HTTP_CREATED);
    }

    /**
     * Display the specified resource.
     */
    /**
     * @OA\Get(path="/api/quizzes/{id}", tags={"Quizzes"}, summary="Get quiz", security={},
     *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function show(Request $request, Quiz $quiz)
    {
        $user = $request->user();
        if (!$user && $request->bearerToken()) {
            $user = Auth::guard('sanctum')->user();
            if ($user) {
                $request->setUserResolver(static fn () => $user);
            }
        }

        $isPublished = $quiz->status === 'published';
        $isPublic = $quiz->visibility === 'public';

        if (!$isPublished || !$isPublic) {
            $canView = $user && ($quiz->owner_id === $user->id || $user->hasAnyRole(['admin', 'superadmin']));
            if (!$canView) {
                return response()->json(['message' => 'Quiz not found'], Response::HTTP_NOT_FOUND);
            }
        }

        $quiz->load(['questions', 'tags', 'category']);
        return response()->json($quiz);
    }

    /**
     * Update the specified resource in storage.
     */
    /**
     * @OA\Put(path="/api/quizzes/{id}", tags={"Quizzes"}, summary="Update quiz", security={{"sanctum":{}}},
     *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\RequestBody(
     *     @OA\JsonContent(
     *       @OA\Property(property="title", type="string"),
     *       @OA\Property(property="description", type="string", nullable=true),
     *       @OA\Property(property="category_id", type="integer", nullable=true),
     *       @OA\Property(property="difficulty", type="string", enum={"easy","medium","hard"}),
     *       @OA\Property(property="is_paid", type="boolean"),
     *       @OA\Property(property="price_cents", type="integer", nullable=true),
     *       @OA\Property(property="timer_seconds", type="integer", nullable=true),
     *       @OA\Property(property="randomize_questions", type="boolean"),
     *       @OA\Property(property="randomize_answers", type="boolean"),
     *       @OA\Property(property="allow_multiple_attempts", type="boolean"),
     *       @OA\Property(property="max_attempts", type="integer", nullable=true),
     *       @OA\Property(property="visibility", type="string", enum={"public","private"}),
     *       @OA\Property(property="negative_marking", type="boolean"),
     *       @OA\Property(property="negative_mark_value", type="number", format="float", nullable=true),
     *       @OA\Property(property="tags", type="array", @OA\Items(type="string"))
     *     )
     *   ),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function update(UpdateQuizRequest $request, Quiz $quiz)
    {
        // Only owner or admin/superadmin
        $user = $request->user();
        if ($quiz->owner_id !== $user->id && !$user->hasAnyRole(['admin', 'superadmin'])) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        $data = $request->validated();
        $tags = $data['tags'] ?? null;
        unset($data['tags']);

        if (array_key_exists('negative_marking', $data) && !$data['negative_marking']) {
            $data['negative_mark_value'] = null;
        }

        $quiz->update($data);

        if ($tags !== null) {
            $quiz->tags()->sync($this->resolveTagIds($tags));
        }

        return response()->json($quiz->load(['tags', 'category']));
    }

    /**
     * Remove the specified resource from storage.
     */
    /**
     * @OA\Delete(path="/api/quizzes/{id}", tags={"Quizzes"}, summary="Delete quiz", security={{"sanctum":{}}},
     *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=204, description="No Content")
     * )
     */
    public function destroy(Request $request, Quiz $quiz)
    {
        $user = $request->user();
        if ($quiz->owner_id !== $user->id && !$user->hasAnyRole(['admin', 'superadmin'])) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        $quiz->delete();
        return response()->json(null, Response::HTTP_NO_CONTENT);
    }

    /**
     * Submit a quiz for approval (owner only)
     */
    public function submit(Request $request, Quiz $quiz)
    {
        $this->middleware('auth:sanctum');
        $user = $request->user();
        if ($quiz->owner_id !== $user->id && !$user->hasAnyRole(['admin', 'superadmin'])) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        if ($quiz->status === 'published') {
            return response()->json(['message' => 'Already published'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        // Set status to pending_review
        $quiz->status = 'pending_review';
        $quiz->save();
        return response()->json($quiz);
    }

    private function resolveTagIds(array $tags): array
    {
        $ids = [];

        foreach ($tags as $tag) {
            if (is_numeric($tag)) {
                $existing = Tag::find((int) $tag);
                if ($existing) {
                    $ids[] = $existing->id;
                }
                continue;
            }

            $name = trim((string) $tag);
            if ($name === '') {
                continue;
            }

            $slug = Str::slug($name);
            $record = Tag::firstOrCreate(['slug' => $slug], ['name' => $name]);
            $ids[] = $record->id;
        }

        return array_values(array_unique($ids));
    }
}
