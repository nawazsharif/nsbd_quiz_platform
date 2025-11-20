<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Http\Response;

/**
 * @OA\Tag(name="Transaction Logs", description="View transaction logs (admin/user)")
 */
class TransactionLogController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * @OA\Get(path="/api/transaction-logs", tags={"Transaction Logs"}, summary="Get transaction logs with filtering",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="user_id", in="query", @OA\Schema(type="integer"), description="Filter by user (admin only)"),
     *   @OA\Parameter(name="type", in="query", @OA\Schema(type="string"), description="Filter by type (comma-separated)"),
     *   @OA\Parameter(name="status", in="query", @OA\Schema(type="string"), description="Filter by status (comma-separated)"),
     *   @OA\Parameter(name="from", in="query", @OA\Schema(type="string", format="date"), description="From date (YYYY-MM-DD)"),
     *   @OA\Parameter(name="to", in="query", @OA\Schema(type="string", format="date"), description="To date (YYYY-MM-DD)"),
     *   @OA\Parameter(name="direction", in="query", @OA\Schema(type="string", enum={"credit","debit"}), description="Filter by credit/debit"),
     *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer"), description="Results per page (1-100)"),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function index(Request $request)
    {
        $user = $request->user();
        $query = WalletTransaction::with('user:id,name,email')->orderByDesc('created_at');

        // Admin can see all transactions or filter by user_id
        // Regular users can only see their own transactions
        if ($user->hasAnyRole(['admin', 'superadmin'])) {
            if ($request->filled('user_id')) {
                $query->where('user_id', $request->integer('user_id'));
            }
        } else {
            $query->where('user_id', $user->id);
        }

        // Filter by type
        if ($request->filled('type')) {
            $types = array_filter(array_map('trim', explode(',', (string) $request->query('type'))));
            if (!empty($types)) {
                $query->ofType($types);
            }
        }

        // Filter by status
        if ($request->filled('status')) {
            $statuses = array_filter(array_map('trim', explode(',', (string) $request->query('status'))));
            if (!empty($statuses)) {
                $query->ofStatus($statuses);
            }
        }

        // Filter by date range
        $query->dateRange(
            $request->query('from'),
            $request->query('to')
        );

        // Filter by direction (credit/debit)
        if ($request->filled('direction')) {
            $direction = $request->query('direction');
            if ($direction === 'credit') {
                $query->where(function ($q) {
                    $q->whereIn('type', ['recharge', 'quiz_sale', 'course_sale', 'platform_fee', 'refund'])
                      ->orWhereJsonContains('meta->direction', 'credit');
                });
            } elseif ($direction === 'debit') {
                $query->where(function ($q) {
                    $q->whereIn('type', ['quiz_purchase', 'course_purchase', 'withdrawal', 'publishing_fee', 'service_charge'])
                      ->orWhereJsonContains('meta->direction', 'debit');
                });
            }
        }

        $perPage = (int) $request->query('per_page', 25);
        $perPage = min(max($perPage, 1), 100);

        $transactions = $query->paginate($perPage);

        return response()->json($transactions, Response::HTTP_OK);
    }

    /**
     * @OA\Get(path="/api/transaction-logs/summary", tags={"Transaction Logs"}, summary="Get transaction summary statistics",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="from", in="query", @OA\Schema(type="string", format="date"), description="From date"),
     *   @OA\Parameter(name="to", in="query", @OA\Schema(type="string", format="date"), description="To date"),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function summary(Request $request)
    {
        $user = $request->user();
        $query = WalletTransaction::query();

        // Filter by user unless admin
        if (!$user->hasAnyRole(['admin', 'superadmin'])) {
            $query->where('user_id', $user->id);
        } elseif ($request->filled('user_id')) {
            $query->where('user_id', $request->integer('user_id'));
        }

        // Date range
        $query->dateRange(
            $request->query('from'),
            $request->query('to')
        );

        // Calculate summary stats
        $totalRecharges = (clone $query)->where('type', 'recharge')
            ->where('status', 'completed')
            ->sum('amount_cents');

        $totalPurchases = (clone $query)->whereIn('type', ['quiz_purchase', 'course_purchase'])
            ->where('status', 'completed')
            ->sum('amount_cents');

        $totalSales = (clone $query)->whereIn('type', ['quiz_sale', 'course_sale'])
            ->where('status', 'completed')
            ->sum('amount_cents');

        $totalWithdrawals = (clone $query)->where('type', 'withdrawal')
            ->where('status', 'completed')
            ->sum('amount_cents');

        $platformFees = (clone $query)->where('type', 'platform_fee')
            ->where('status', 'completed')
            ->sum('amount_cents');

        $transactionCount = $query->count();
        $completedCount = (clone $query)->where('status', 'completed')->count();
        $pendingCount = (clone $query)->where('status', 'pending')->count();
        $failedCount = (clone $query)->where('status', 'failed')->count();

        return response()->json([
            'total_recharges_cents' => (int) $totalRecharges,
            'total_purchases_cents' => (int) $totalPurchases,
            'total_sales_cents' => (int) $totalSales,
            'total_withdrawals_cents' => (int) $totalWithdrawals,
            'total_platform_fees_cents' => (int) $platformFees,
            'net_balance_cents' => (int) ($totalRecharges + $totalSales - $totalPurchases - $totalWithdrawals),
            'transaction_count' => $transactionCount,
            'completed_count' => $completedCount,
            'pending_count' => $pendingCount,
            'failed_count' => $failedCount,
        ], Response::HTTP_OK);
    }

    /**
     * @OA\Get(path="/api/transaction-logs/{id}", tags={"Transaction Logs"}, summary="Get single transaction details",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="id", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function show(Request $request, int $id)
    {
        $user = $request->user();
        $query = WalletTransaction::with('user:id,name,email');

        // Admin can see any transaction, users only their own
        if (!$user->hasAnyRole(['admin', 'superadmin'])) {
            $query->where('user_id', $user->id);
        }

        $transaction = $query->findOrFail($id);

        return response()->json($transaction, Response::HTTP_OK);
    }
}
