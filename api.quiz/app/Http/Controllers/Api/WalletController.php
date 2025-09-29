<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WalletAccount;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Str;

/**
 * @OA\Tag(name="Wallet", description="Wallet operations")
 *
 * @OA\Schema(
 *   schema="WalletAccount",
 *   type="object",
 *   @OA\Property(property="user_id", type="integer"),
 *   @OA\Property(property="balance_cents", type="integer")
 * )
 *
 * @OA\Schema(
 *   schema="WalletTransaction",
 *   type="object",
 *   @OA\Property(property="transaction_id", type="string"),
 *   @OA\Property(property="type", type="string"),
 *   @OA\Property(property="amount_cents", type="integer"),
 *   @OA\Property(property="status", type="string")
 * )
 */
class WalletController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * @OA\Get(path="/api/wallet/balance", tags={"Wallet"}, summary="Get wallet balance",
     *   security={{"sanctum":{}}},
     *   @OA\Response(response=200, description="OK",
     *     @OA\JsonContent(ref="#/components/schemas/WalletAccount")
     *   )
     * )
     */
    public function balance(Request $request)
    {
        $wallet = WalletAccount::firstOrCreate(['user_id' => $request->user()->id]);
        $wallet->refresh();
        return response()->json($wallet);
    }

    /**
     * @OA\Post(path="/api/wallet/recharge", tags={"Wallet"}, summary="Initiate recharge",
     *   security={{"sanctum":{}}},
     *   @OA\RequestBody(@OA\JsonContent(
     *     required={"amount_cents","provider"},
     *     @OA\Property(property="amount_cents", type="integer"),
     *     @OA\Property(property="provider", type="string", enum={"bkash","sslcommerz"})
     *   )),
     *   @OA\Response(response=201, description="Created",
     *     @OA\JsonContent(ref="#/components/schemas/WalletTransaction")
     *   )
     * )
     */
    public function recharge(Request $request)
    {
        $validated = $request->validate([
            'amount_cents' => 'required|integer|min:100',
            'provider' => 'required|in:bkash,sslcommerz',
        ]);
        $tx = WalletTransaction::create([
            'user_id' => $request->user()->id,
            'transaction_id' => Str::uuid()->toString(),
            'type' => 'recharge',
            'amount_cents' => $validated['amount_cents'],
            'status' => 'pending',
            'meta' => ['provider' => $validated['provider']],
        ]);
        // In real life, return gateway session/link
        return response()->json($tx, Response::HTTP_CREATED);
    }

    /**
     * @OA\Post(path="/api/wallet/recharge/confirm", tags={"Wallet"}, summary="Confirm recharge (webhook/mock)",
     *   security={{"sanctum":{}}},
     *   @OA\RequestBody(@OA\JsonContent(
     *     required={"transaction_id","status"},
     *     @OA\Property(property="transaction_id", type="string"),
     *     @OA\Property(property="status", type="string", enum={"completed","failed"})
     *   )),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function confirm(Request $request)
    {
        $validated = $request->validate([
            'transaction_id' => 'required|string',
            'status' => 'required|in:completed,failed',
        ]);
        $tx = WalletTransaction::where('transaction_id', $validated['transaction_id'])
            ->where('user_id', $request->user()->id)
            ->firstOrFail();
        if ($tx->status !== 'pending') {
            return response()->json(['message' => 'Already processed'], 200);
        }
        $tx->status = $validated['status'];
        $tx->save();
        if ($validated['status'] === 'completed') {
            $wallet = WalletAccount::firstOrCreate(['user_id' => $request->user()->id]);
            $wallet->balance_cents += $tx->amount_cents;
            $wallet->save();
        }
        return response()->json($tx);
    }
}
