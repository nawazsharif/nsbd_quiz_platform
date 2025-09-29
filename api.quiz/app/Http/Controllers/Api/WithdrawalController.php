<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WalletAccount;
use App\Models\WithdrawalRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * @OA\Tag(name="Withdrawals", description="Withdrawal requests and approvals")
 */
class WithdrawalController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * @OA\Post(path="/api/wallet/withdrawals", tags={"Withdrawals"}, summary="Request withdrawal",
     *   security={{"sanctum":{}}},
     *   @OA\RequestBody(@OA\JsonContent(
     *     required={"amount_cents","provider"},
     *     @OA\Property(property="amount_cents", type="integer"),
     *     @OA\Property(property="provider", type="string", enum={"bkash","sslcommerz"})
     *   )),
     *   @OA\Response(response=201, description="Created")
     * )
     */
    public function requestWithdrawal(Request $request)
    {
        $validated = $request->validate([
            'amount_cents' => 'required|integer|min:100',
            'provider' => 'required|in:bkash,sslcommerz',
        ]);
        $wallet = WalletAccount::firstOrCreate(['user_id' => $request->user()->id]);
        if ($wallet->balance_cents < $validated['amount_cents']) {
            return response()->json(['message' => 'Insufficient balance'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        $wr = WithdrawalRequest::create([
            'user_id' => $request->user()->id,
            'amount_cents' => $validated['amount_cents'],
            'status' => 'pending',
            'provider' => $validated['provider'],
        ]);
        return response()->json($wr, Response::HTTP_CREATED);
    }

    /**
     * @OA\Get(path="/api/admin/withdrawals", tags={"Withdrawals"}, summary="List pending withdrawals",
     *   security={{"sanctum":{}}},
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function adminList(Request $request)
    {
        $this->authorizeAdmin($request);
        return response()->json(WithdrawalRequest::where('status', 'pending')->get());
    }

    /**
     * @OA\Post(path="/api/admin/withdrawals/{id}/approve", tags={"Withdrawals"}, summary="Approve withdrawal",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function approve(Request $request, WithdrawalRequest $withdrawal)
    {
        $this->authorizeAdmin($request);
        if ($withdrawal->status !== 'pending') {
            return response()->json(['message' => 'Already processed'], 200);
        }
        $wallet = WalletAccount::firstOrCreate(['user_id' => $withdrawal->user_id]);
        if ($wallet->balance_cents < $withdrawal->amount_cents) {
            return response()->json(['message' => 'Insufficient balance'], Response::HTTP_UNPROCESSABLE_ENTITY);
        }
        $wallet->balance_cents -= $withdrawal->amount_cents;
        $wallet->save();
        $withdrawal->status = 'approved';
        $withdrawal->approved_at = now();
        $withdrawal->approved_by = $request->user()->id;
        $withdrawal->save();
        return response()->json($withdrawal);
    }

    /**
     * @OA\Post(path="/api/admin/withdrawals/{id}/reject", tags={"Withdrawals"}, summary="Reject withdrawal",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function reject(Request $request, WithdrawalRequest $withdrawal)
    {
        $this->authorizeAdmin($request);
        if ($withdrawal->status !== 'pending') {
            return response()->json(['message' => 'Already processed'], 200);
        }
        $withdrawal->status = 'rejected';
        $withdrawal->approved_at = now();
        $withdrawal->approved_by = $request->user()->id;
        $withdrawal->save();
        return response()->json($withdrawal);
    }

    protected function authorizeAdmin(Request $request): void
    {
        if (!$request->user()->hasAnyRole(['admin','superadmin'])) {
            abort(Response::HTTP_FORBIDDEN);
        }
    }
}
