<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\PlatformRevenue;
use App\Models\Setting;
use App\Models\WalletAccount;
use Illuminate\Http\Request;

/**
 * @OA\Tag(name="Course Purchase", description="Enroll or purchase courses")
 */
class CoursePurchaseController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * @OA\Post(
     *   path="/api/courses/{course}/enroll",
     *   tags={"Course Purchase"},
     *   summary="Enroll free or purchase paid course",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="course", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function enrollOrPurchase(Request $request, Course $course)
    {
        $user = $request->user();

        // Check if user is course owner, admin, or superadmin - they have automatic access
        if ($course->owner_id === $user->id || $user->hasAnyRole(['admin', 'superadmin'])) {
            // No enrollment record needed for owners/admins, they have automatic access
            return response()->json([
                'status' => 'automatic_access',
                'access_type' => $course->owner_id === $user->id ? 'owner' : 'admin',
                'message' => 'You have automatic access to this course'
            ]);
        }

        if (!$course->is_paid) {
            CourseEnrollment::firstOrCreate(['course_id' => $course->id, 'user_id' => $user->id]);
            return response()->json(['status' => 'enrolled']);
        }

        $commissionPercent = (int) (Setting::where('key', 'course_platform_commission_percent')->value('value') ?? 0);
        $price = (int) ($course->price_cents ?? 0);
        if ($price <= 0) {
            return response()->json(['message' => 'Invalid course price'], 422);
        }

        // Check if user has sufficient wallet balance
        $buyerWallet = WalletAccount::firstOrCreate(['user_id' => $user->id]);
        if ($buyerWallet->balance_cents < $price) {
            return response()->json(['message' => 'Insufficient wallet balance'], 422);
        }

        $platformShare = (int) floor($price * $commissionPercent / 100);
        $authorShare = $price - $platformShare;

        // Deduct from buyer wallet
        $buyerWallet->balance_cents -= $price;
        $buyerWallet->save();

        // Credit author wallet
        $authorWallet = WalletAccount::firstOrCreate(['user_id' => $course->owner_id]);
        $authorWallet->balance_cents += $authorShare;
        $authorWallet->save();

        // Credit platform revenue to superadmin wallet
        $superadmin = \App\Models\User::role('superadmin')->first();
        if ($superadmin) {
            $superadminWallet = WalletAccount::firstOrCreate(['user_id' => $superadmin->id]);
            $superadminWallet->balance_cents += $platformShare;
            $superadminWallet->save();
        }

        PlatformRevenue::create([
            'course_id' => $course->id,
            'buyer_id' => $user->id,
            'amount_cents' => $platformShare,
            'source' => 'course_purchase',
        ]);

        CourseEnrollment::firstOrCreate(['course_id' => $course->id, 'user_id' => $user->id]);
        return response()->json(['status' => 'purchased', 'author_credited_cents' => $authorShare, 'platform_revenue_cents' => $platformShare]);
    }
}
