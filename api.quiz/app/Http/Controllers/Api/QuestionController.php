<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreQuestionRequest;
use App\Http\Requests\UpdateQuestionRequest;
use App\Models\Question;
use App\Models\QuestionOption;
use App\Models\Quiz;
use Illuminate\Http\Response;
use Illuminate\Http\Request;

/**
 * @OA\Tag(name="Questions", description="Question management (nested under quizzes)")
 *
 * @OA\Schema(
 *   schema="QuestionOption",
 *   type="object",
 *   @OA\Property(property="id", type="integer"),
 *   @OA\Property(property="text", type="string"),
 *   @OA\Property(property="is_correct", type="boolean"),
 *   @OA\Property(property="order_index", type="integer")
 * )
 *
 * @OA\Schema(
 *   schema="Question",
 *   type="object",
 *   @OA\Property(property="id", type="integer"),
 *   @OA\Property(property="quiz_id", type="integer"),
 *   @OA\Property(property="type", type="string", enum={"mcq","true_false","short_desc"}),
 *   @OA\Property(property="order_index", type="integer"),
 *   @OA\Property(property="text", type="string"),
 *   @OA\Property(property="prompt", type="string"),
 *   @OA\Property(property="sample_answer", type="string"),
 *   @OA\Property(property="multiple_correct", type="boolean"),
 *   @OA\Property(property="correct_boolean", type="boolean"),
 *   @OA\Property(property="points", type="integer"),
 *   @OA\Property(property="requires_manual_grading", type="boolean"),
 *   @OA\Property(property="options", type="array", @OA\Items(ref="#/components/schemas/QuestionOption"))
 * )
 */
class QuestionController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum')->only(['store', 'update', 'destroy']);
    }
    /**
     * Display a listing of the resource.
     */
    /**
     * @OA\Get(
     *   path="/api/quizzes/{quiz}/questions",
     *   tags={"Questions"},
     *   summary="List questions of a quiz",
     *   security={},
     *   @OA\Parameter(name="quiz", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK",
     *     @OA\JsonContent(type="array", @OA\Items(ref="#/components/schemas/Question"))
     *   )
     * )
     */
    public function index(Quiz $quiz)
    {
        return response()->json($quiz->questions()->with('options')->orderBy('order_index')->get());
    }

    /**
     * Store a newly created resource in storage.
     */
    /**
     * @OA\Post(
     *   path="/api/quizzes/{quiz}/questions",
     *   tags={"Questions"},
     *   summary="Create question",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="quiz", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\RequestBody(
     *     required=true,
     *     @OA\JsonContent(
     *       required={"type","order_index"},
     *       @OA\Property(property="type", type="string", enum={"mcq","true_false","short_desc"}),
     *       @OA\Property(property="order_index", type="integer"),
     *       @OA\Property(property="text", type="string"),
     *       @OA\Property(property="prompt", type="string"),
     *       @OA\Property(property="sample_answer", type="string"),
     *       @OA\Property(property="correct_boolean", type="boolean"),
     *       @OA\Property(property="multiple_correct", type="boolean"),
     *       @OA\Property(property="options", type="array", @OA\Items(ref="#/components/schemas/QuestionOption"))
     *     )
     *   ),
     *   @OA\Response(response=201, description="Created", @OA\JsonContent(ref="#/components/schemas/Question"))
     * )
     */
    public function store(StoreQuestionRequest $request, Quiz $quiz)
    {
        $user = $request->user();
        if ($quiz->owner_id !== $user->id && !$user->hasAnyRole(['admin', 'superadmin'])) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }

        $data = $request->validated();
        $question = new Question($data);
        $question->quiz_id = $quiz->id;
        if ($data['type'] === 'short_desc') {
            $question->requires_manual_grading = true;
        }
        $question->save();

        if ($data['type'] === 'mcq' && isset($data['options'])) {
            $order = 1;
            foreach ($data['options'] as $opt) {
                QuestionOption::create([
                    'question_id' => $question->id,
                    'text' => $opt['text'],
                    'is_correct' => (bool) $opt['is_correct'],
                    'order_index' => $order++,
                ]);
            }
        }

        return response()->json($question->fresh('options'), Response::HTTP_CREATED);
    }

    /**
     * Display the specified resource.
     */
    /**
     * @OA\Get(
     *   path="/api/quizzes/{quiz}/questions/{question}",
     *   tags={"Questions"},
     *   summary="Get question",
     *   security={},
     *   @OA\Parameter(name="quiz", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Parameter(name="question", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK", @OA\JsonContent(ref="#/components/schemas/Question")),
     *   @OA\Response(response=404, description="Not Found")
     * )
     */
    public function show(Quiz $quiz, Question $question)
    {
        abort_unless($question->quiz_id === $quiz->id, 404);
        return response()->json($question->load('options'));
    }

    /**
     * Update the specified resource in storage.
     */
    /**
     * @OA\Put(
     *   path="/api/quizzes/{quiz}/questions/{question}",
     *   tags={"Questions"},
     *   summary="Update question",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="quiz", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Parameter(name="question", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\RequestBody(@OA\JsonContent(ref="#/components/schemas/Question")),
     *   @OA\Response(response=200, description="OK", @OA\JsonContent(ref="#/components/schemas/Question")),
     *   @OA\Response(response=403, description="Forbidden")
     * )
     */
    public function update(UpdateQuestionRequest $request, Quiz $quiz, Question $question)
    {
        $user = $request->user();
        if ($quiz->owner_id !== $user->id && !$user->hasAnyRole(['admin', 'superadmin'])) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        abort_unless($question->quiz_id === $quiz->id, 404);

        $data = $request->validated();
        $question->update($data);

        if ($question->type === 'mcq' && isset($data['options'])) {
            $question->options()->delete();
            $order = 1;
            foreach ($data['options'] as $opt) {
                QuestionOption::create([
                    'question_id' => $question->id,
                    'text' => $opt['text'],
                    'is_correct' => (bool) $opt['is_correct'],
                    'order_index' => $order++,
                ]);
            }
        }

        return response()->json($question->load('options'));
    }

    /**
     * Remove the specified resource from storage.
     */
    /**
     * @OA\Delete(
     *   path="/api/quizzes/{quiz}/questions/{question}",
     *   tags={"Questions"},
     *   summary="Delete question",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="quiz", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Parameter(name="question", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=204, description="No Content"),
     *   @OA\Response(response=403, description="Forbidden")
     * )
     */
    public function destroy(Request $request, Quiz $quiz, Question $question)
    {
        $user = $request->user();
        if ($quiz->owner_id !== $user->id && !$user->hasAnyRole(['admin', 'superadmin'])) {
            return response()->json(['message' => 'Forbidden'], Response::HTTP_FORBIDDEN);
        }
        abort_unless($question->quiz_id === $quiz->id, 404);
        $question->delete();
        return response()->json(null, Response::HTTP_NO_CONTENT);
    }
}
