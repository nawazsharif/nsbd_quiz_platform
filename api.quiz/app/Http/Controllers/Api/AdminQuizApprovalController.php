<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Quiz;
use App\Models\Setting;
use App\Models\WalletAccount;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * @OA\Tag(name="Quiz Approval", description="Admin and superadmin quiz approvals")
 */
class AdminQuizApprovalController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
        $this->middleware('role:admin|superadmin,sanctum');
    }

    /**
     * @OA\Post(path="/api/admin/quizzes/{quiz}/approve", tags={"Quiz Approval"}, summary="Approve quiz",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="quiz", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function approve(Request $request, Quiz $quiz)
    {
        if ($quiz->status === 'published') {
            return response()->json(['message' => 'Already approved']);
        }
        if ($quiz->is_paid) {
            $fee = (int) (Setting::where('key', 'paid_quiz_approval_amount_cents')->value('value') ?? 0);
            $wallet = WalletAccount::firstOrCreate(['user_id' => $quiz->owner_id]);
            if ($wallet->balance_cents < $fee) {
                return response()->json(['message' => 'Insufficient wallet balance for approval fee'], Response::HTTP_UNPROCESSABLE_ENTITY);
            }
            $wallet->balance_cents -= $fee;
            $wallet->save();
        }
        $quiz->status = 'published';
        $quiz->save();
        return response()->json($quiz);
    }

    /**
     * @OA\Post(path="/api/admin/quizzes/{quiz}/reject", tags={"Quiz Approval"}, summary="Reject quiz",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="quiz", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function reject(Request $request, Quiz $quiz)
    {
        $quiz->status = 'rejected';
        $quiz->save();
        return response()->json($quiz);
    }
}
