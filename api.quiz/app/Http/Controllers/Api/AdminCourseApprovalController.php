<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\PlatformRevenue;
use App\Models\Setting;
use App\Models\WalletAccount;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * @OA\Tag(name="Course Approval", description="Approve or reject courses (admin)")
 */
class AdminCourseApprovalController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
        $this->middleware('role:admin|superadmin,sanctum');
    }

    /**
     * @OA\Post(path="/api/admin/courses/{course}/approve", tags={"Course Approval"}, summary="Approve course and charge fee",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="course", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function approve(Request $request, Course $course)
    {
        $fee = (int) (Setting::where('key', 'course_approval_fee_cents')->value('value') ?? 0);
        $authorWallet = WalletAccount::firstOrCreate(['user_id' => $course->owner_id]);
        if ($authorWallet->balance_cents < $fee) {
            return response()->json(['message' => 'Insufficient wallet balance for approval fee'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        $authorWallet->balance_cents -= $fee;
        $authorWallet->save();

        PlatformRevenue::create([
            'course_id' => $course->id,
            'buyer_id' => null,
            'amount_cents' => $fee,
            'source' => 'course_approval_fee',
        ]);

        $course->status = 'approved';
        $course->rejection_note = null;
        $course->save();

        return response()->json(['message' => 'Approved']);
    }

    /**
     * @OA\Post(path="/api/admin/courses/{course}/reject", tags={"Course Approval"}, summary="Reject course",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="course", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\RequestBody(@OA\JsonContent(@OA\Property(property="reason", type="string"))),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function reject(Request $request, Course $course)
    {
        $data = $request->validate(['reason' => 'nullable|string']);
        $course->status = 'rejected';
        $course->rejection_note = $data['reason'] ?? null;
        $course->save();
        return response()->json(['message' => 'Rejected']);
    }
}
