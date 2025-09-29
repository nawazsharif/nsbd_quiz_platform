<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PlatformRevenue;
use App\Models\Quiz;
use App\Models\QuizEnrollment;
use App\Models\Setting;
use App\Models\WalletAccount;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * @OA\Tag(name="Purchase", description="Enroll or purchase quizzes")
 */
class PurchaseController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * @OA\Post(path="/api/quizzes/{quiz}/enroll", tags={"Purchase"}, summary="Enroll free or purchase paid quiz",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="quiz", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function enrollOrPurchase(Request $request, Quiz $quiz)
    {
        $user = $request->user();
        
        // Check if user is quiz owner, admin, or superadmin - they have automatic access
        if ($quiz->owner_id === $user->id || $user->hasAnyRole(['admin', 'superadmin'])) {
            // No enrollment record needed for owners/admins, they have automatic access
            return response()->json([
                'status' => 'automatic_access',
                'access_type' => $quiz->owner_id === $user->id ? 'owner' : 'admin',
                'message' => 'You have automatic access to this quiz'
            ]);
        }

        if (!$quiz->is_paid) {
            QuizEnrollment::firstOrCreate(['quiz_id' => $quiz->id, 'user_id' => $user->id]);
            return response()->json(['status' => 'enrolled']);
        }

        $commissionPercent = (int) (Setting::where('key', 'quiz_platform_commission_percent')->value('value') ?? 0);
        $price = (int) ($quiz->price_cents ?? 0);
        if ($price <= 0) {
            return response()->json(['message' => 'Invalid quiz price'], 422);
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
        $authorWallet = WalletAccount::firstOrCreate(['user_id' => $quiz->owner_id]);
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
            'quiz_id' => $quiz->id,
            'buyer_id' => $user->id,
            'amount_cents' => $platformShare,
            'source' => 'quiz_purchase',
        ]);

        QuizEnrollment::firstOrCreate(['quiz_id' => $quiz->id, 'user_id' => $user->id]);
        return response()->json(['status' => 'purchased', 'author_credited_cents' => $authorShare, 'platform_revenue_cents' => $platformShare]);
    }
}
