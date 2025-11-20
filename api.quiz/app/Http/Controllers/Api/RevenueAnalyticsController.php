<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\PlatformRevenue;
use App\Models\Quiz;
use App\Models\WalletTransaction;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

/**
 * @OA\Tag(name="Revenue Analytics", description="Revenue analytics for admins and creators")
 */
class RevenueAnalyticsController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * @OA\Get(path="/api/revenue/platform", tags={"Revenue Analytics"}, summary="Get platform revenue (admin only)",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="from", in="query", @OA\Schema(type="string", format="date")),
     *   @OA\Parameter(name="to", in="query", @OA\Schema(type="string", format="date")),
     *   @OA\Parameter(name="source", in="query", @OA\Schema(type="string"), description="Filter by source"),
     *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function platformRevenue(Request $request)
    {
        $user = $request->user();

        // Only admin/superadmin can view platform revenue
        if (!$user->hasAnyRole(['admin', 'superadmin'])) {
            return response()->json(['message' => 'Unauthorized'], Response::HTTP_FORBIDDEN);
        }

        $query = PlatformRevenue::with(['quiz:id,title,owner_id', 'course:id,title,owner_id', 'buyer:id,name,email'])
            ->orderByDesc('created_at');

        // Filter by source
        if ($request->filled('source')) {
            $sources = array_filter(array_map('trim', explode(',', (string) $request->query('source'))));
            if (!empty($sources)) {
                $query->ofSource($sources);
            }
        }

        // Filter by date range
        $query->dateRange(
            $request->query('from'),
            $request->query('to')
        );

        $perPage = (int) $request->query('per_page', 25);
        $perPage = min(max($perPage, 1), 100);

        $revenues = $query->paginate($perPage);

        // Calculate summary
        $totalRevenue = PlatformRevenue::query()
            ->when($request->filled('source'), function ($q) use ($request) {
                $sources = array_filter(array_map('trim', explode(',', (string) $request->query('source'))));
                if (!empty($sources)) {
                    $q->ofSource($sources);
                }
            })
            ->dateRange($request->query('from'), $request->query('to'))
            ->sum('amount_cents');

        return response()->json([
            'data' => $revenues->items(),
            'meta' => [
                'current_page' => $revenues->currentPage(),
                'per_page' => $revenues->perPage(),
                'total' => $revenues->total(),
                'last_page' => $revenues->lastPage(),
            ],
            'summary' => [
                'total_revenue_cents' => (int) $totalRevenue,
            ],
        ], Response::HTTP_OK);
    }

    /**
     * @OA\Get(path="/api/revenue/platform/breakdown", tags={"Revenue Analytics"}, summary="Platform revenue breakdown by source",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="from", in="query", @OA\Schema(type="string", format="date")),
     *   @OA\Parameter(name="to", in="query", @OA\Schema(type="string", format="date")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function platformRevenueBreakdown(Request $request)
    {
        $user = $request->user();

        if (!$user->hasAnyRole(['admin', 'superadmin'])) {
            return response()->json(['message' => 'Unauthorized'], Response::HTTP_FORBIDDEN);
        }

        $query = PlatformRevenue::query();

        // Date range filter
        $query->dateRange(
            $request->query('from'),
            $request->query('to')
        );

        $breakdown = $query->select('source', DB::raw('SUM(amount_cents) as total_cents'), DB::raw('COUNT(*) as count'))
            ->groupBy('source')
            ->get();

        $totalRevenue = $breakdown->sum('total_cents');

        return response()->json([
            'breakdown' => $breakdown,
            'total_revenue_cents' => (int) $totalRevenue,
        ], Response::HTTP_OK);
    }

    /**
     * @OA\Get(path="/api/revenue/my-quizzes", tags={"Revenue Analytics"}, summary="Get creator's quiz revenue",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="from", in="query", @OA\Schema(type="string", format="date")),
     *   @OA\Parameter(name="to", in="query", @OA\Schema(type="string", format="date")),
     *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function myQuizRevenue(Request $request)
    {
        $user = $request->user();

        $query = WalletTransaction::where('user_id', $user->id)
            ->where('type', 'quiz_sale')
            ->where('status', 'completed')
            ->orderByDesc('created_at');

        // Date range filter
        $query->dateRange(
            $request->query('from'),
            $request->query('to')
        );

        $perPage = (int) $request->query('per_page', 25);
        $perPage = min(max($perPage, 1), 100);

        $sales = $query->paginate($perPage);

        // Summary
        $totalRevenue = WalletTransaction::where('user_id', $user->id)
            ->where('type', 'quiz_sale')
            ->where('status', 'completed')
            ->dateRange($request->query('from'), $request->query('to'))
            ->sum('amount_cents');

        return response()->json([
            'data' => $sales->items(),
            'meta' => [
                'current_page' => $sales->currentPage(),
                'per_page' => $sales->perPage(),
                'total' => $sales->total(),
                'last_page' => $sales->lastPage(),
            ],
            'summary' => [
                'total_revenue_cents' => (int) $totalRevenue,
            ],
        ], Response::HTTP_OK);
    }

    /**
     * @OA\Get(path="/api/revenue/my-courses", tags={"Revenue Analytics"}, summary="Get creator's course revenue",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="from", in="query", @OA\Schema(type="string", format="date")),
     *   @OA\Parameter(name="to", in="query", @OA\Schema(type="string", format="date")),
     *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function myCourseRevenue(Request $request)
    {
        $user = $request->user();

        $query = WalletTransaction::where('user_id', $user->id)
            ->where('type', 'course_sale')
            ->where('status', 'completed')
            ->orderByDesc('created_at');

        // Date range filter
        $query->dateRange(
            $request->query('from'),
            $request->query('to')
        );

        $perPage = (int) $request->query('per_page', 25);
        $perPage = min(max($perPage, 1), 100);

        $sales = $query->paginate($perPage);

        // Summary
        $totalRevenue = WalletTransaction::where('user_id', $user->id)
            ->where('type', 'course_sale')
            ->where('status', 'completed')
            ->dateRange($request->query('from'), $request->query('to'))
            ->sum('amount_cents');

        return response()->json([
            'data' => $sales->items(),
            'meta' => [
                'current_page' => $sales->currentPage(),
                'per_page' => $sales->perPage(),
                'total' => $sales->total(),
                'last_page' => $sales->lastPage(),
            ],
            'summary' => [
                'total_revenue_cents' => (int) $totalRevenue,
            ],
        ], Response::HTTP_OK);
    }

    /**
     * @OA\Get(path="/api/revenue/quiz/{quiz}/purchases", tags={"Revenue Analytics"}, summary="Get purchase log for a specific quiz",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="quiz", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function quizPurchases(Request $request, Quiz $quiz)
    {
        $user = $request->user();

        // Only owner, admin, or superadmin can view quiz purchases
        if ($quiz->owner_id !== $user->id && !$user->hasAnyRole(['admin', 'superadmin'])) {
            return response()->json(['message' => 'Unauthorized'], Response::HTTP_FORBIDDEN);
        }

        $query = WalletTransaction::where('type', 'quiz_purchase')
            ->where('status', 'completed')
            ->whereJsonContains('meta->quiz_id', $quiz->id)
            ->with('user:id,name,email')
            ->orderByDesc('created_at');

        $perPage = (int) $request->query('per_page', 25);
        $perPage = min(max($perPage, 1), 100);

        $purchases = $query->paginate($perPage);

        // Get platform revenue for this quiz
        $platformRevenue = PlatformRevenue::where('quiz_id', $quiz->id)
            ->sum('amount_cents');

        // Get creator revenue for this quiz
        $creatorRevenue = WalletTransaction::where('user_id', $quiz->owner_id)
            ->where('type', 'quiz_sale')
            ->where('status', 'completed')
            ->whereJsonContains('meta->quiz_id', $quiz->id)
            ->sum('amount_cents');

        return response()->json([
            'data' => $purchases->items(),
            'meta' => [
                'current_page' => $purchases->currentPage(),
                'per_page' => $purchases->perPage(),
                'total' => $purchases->total(),
                'last_page' => $purchases->lastPage(),
            ],
            'summary' => [
                'total_purchases' => $purchases->total(),
                'platform_revenue_cents' => (int) $platformRevenue,
                'creator_revenue_cents' => (int) $creatorRevenue,
                'total_gross_cents' => (int) ($platformRevenue + $creatorRevenue),
            ],
        ], Response::HTTP_OK);
    }

    /**
     * @OA\Get(path="/api/revenue/course/{course}/purchases", tags={"Revenue Analytics"}, summary="Get purchase log for a specific course",
     *   security={{"sanctum":{}}},
     *   @OA\Parameter(name="course", in="path", required=true, @OA\Schema(type="integer")),
     *   @OA\Parameter(name="per_page", in="query", @OA\Schema(type="integer")),
     *   @OA\Response(response=200, description="OK")
     * )
     */
    public function coursePurchases(Request $request, Course $course)
    {
        $user = $request->user();

        // Only owner, admin, or superadmin can view course purchases
        if ($course->owner_id !== $user->id && !$user->hasAnyRole(['admin', 'superadmin'])) {
            return response()->json(['message' => 'Unauthorized'], Response::HTTP_FORBIDDEN);
        }

        $query = WalletTransaction::where('type', 'course_purchase')
            ->where('status', 'completed')
            ->whereJsonContains('meta->course_id', $course->id)
            ->with('user:id,name,email')
            ->orderByDesc('created_at');

        $perPage = (int) $request->query('per_page', 25);
        $perPage = min(max($perPage, 1), 100);

        $purchases = $query->paginate($perPage);

        // Get platform revenue for this course
        $platformRevenue = PlatformRevenue::where('course_id', $course->id)
            ->sum('amount_cents');

        // Get creator revenue for this course
        $creatorRevenue = WalletTransaction::where('user_id', $course->owner_id)
            ->where('type', 'course_sale')
            ->where('status', 'completed')
            ->whereJsonContains('meta->course_id', $course->id)
            ->sum('amount_cents');

        return response()->json([
            'data' => $purchases->items(),
            'meta' => [
                'current_page' => $purchases->currentPage(),
                'per_page' => $purchases->perPage(),
                'total' => $purchases->total(),
                'last_page' => $purchases->lastPage(),
            ],
            'summary' => [
                'total_purchases' => $purchases->total(),
                'platform_revenue_cents' => (int) $platformRevenue,
                'creator_revenue_cents' => (int) $creatorRevenue,
                'total_gross_cents' => (int) ($platformRevenue + $creatorRevenue),
            ],
        ], Response::HTTP_OK);
    }
}
