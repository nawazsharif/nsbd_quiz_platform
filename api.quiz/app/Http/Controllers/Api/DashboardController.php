<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Course;
use App\Models\CourseEnrollment;
use App\Models\Quiz;
use App\Models\QuizAttempt;
use App\Models\QuizEnrollment;
use App\Models\User;
use App\Models\WalletAccount;
use App\Models\TransactionLog;
use App\Models\PlatformRevenue;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

/**
 * @OA\Tag(name="Dashboard", description="Dashboard statistics and analytics")
 */
class DashboardController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * @OA\Get(
     *     path="/api/dashboard/stats",
     *     tags={"Dashboard"},
     *     summary="Get role-based dashboard statistics",
     *     security={{"sanctum":{}}},
     *     @OA\Response(response=200, description="Dashboard statistics")
     * )
     */
    public function getStats(Request $request)
    {
        $user = $request->user();
        $isAdmin = $user->hasAnyRole(['admin', 'superadmin']);
        $isSuperAdmin = $user->hasRole('superadmin');

        $stats = [];

        if ($isSuperAdmin) {
            $stats = $this->getSuperAdminStats($user);
        } elseif ($isAdmin) {
            $stats = $this->getAdminStats($user);
        } else {
            $stats = $this->getUserStats($user);
        }

        return response()->json($stats);
    }

    /**
     * Get Super Admin dashboard statistics
     */
    private function getSuperAdminStats($user)
    {
        $today = Carbon::today();
        $thisMonth = Carbon::now()->startOfMonth();
        $lastMonth = Carbon::now()->subMonth()->startOfMonth();

        return [
            'role' => 'superadmin',
            'overview' => [
                'total_users' => User::count(),
                'new_users_today' => User::whereDate('created_at', $today)->count(),
                'total_quizzes' => Quiz::count(),
                'published_quizzes' => Quiz::where('status', 'published')->count(),
                'total_courses' => Course::count(),
                'published_courses' => Course::where('status', 'approved')->count(),
                'pending_approvals' => Quiz::where('status', 'submitted')->count() +
                                      Course::where('status', 'submitted')->count(),
            ],
            'revenue' => [
                'total_platform_revenue' => PlatformRevenue::sum('amount_cents') / 100,
                'revenue_this_month' => PlatformRevenue::where('created_at', '>=', $thisMonth)->sum('amount_cents') / 100,
                'revenue_last_month' => PlatformRevenue::whereBetween('created_at', [$lastMonth, $thisMonth])->sum('amount_cents') / 100,
                'approval_fees' => PlatformRevenue::whereIn('source', ['quiz_approval_fee', 'course_approval_fee'])->sum('amount_cents') / 100,
                'commission_fees' => PlatformRevenue::whereIn('source', ['quiz_purchase', 'course_purchase'])->sum('amount_cents') / 100,
            ],
            'activity' => [
                'total_quiz_attempts' => QuizAttempt::count(),
                'completed_attempts' => QuizAttempt::where('status', 'completed')->count(),
                'active_enrollments' => QuizEnrollment::count() + CourseEnrollment::count(),
                'transactions_today' => DB::table('wallet_transactions')->whereDate('created_at', $today)->count(),
            ],
            'charts' => [
                'user_growth' => $this->getUserGrowthChart(),
                'revenue_trend' => $this->getRevenueTrendChart(),
                'content_distribution' => $this->getContentDistributionChart(),
            ],
        ];
    }

    /**
     * Get Admin dashboard statistics
     */
    private function getAdminStats($user)
    {
        $today = Carbon::today();
        $thisMonth = Carbon::now()->startOfMonth();

        return [
            'role' => 'admin',
            'overview' => [
                'pending_quiz_approvals' => Quiz::where('status', 'submitted')->count(),
                'pending_course_approvals' => Course::where('status', 'submitted')->count(),
                'total_users' => User::count(),
                'new_users_this_month' => User::where('created_at', '>=', $thisMonth)->count(),
                'published_quizzes' => Quiz::where('status', 'published')->count(),
                'published_courses' => Course::where('status', 'approved')->count(),
            ],
            'recent_activity' => [
                'recent_quiz_submissions' => Quiz::where('status', 'submitted')
                    ->with('owner:id,name,email')
                    ->latest()
                    ->take(5)
                    ->get(['id', 'title', 'owner_id', 'created_at', 'is_paid', 'price_cents']),
                'recent_course_submissions' => Course::where('status', 'submitted')
                    ->with('owner:id,name,email')
                    ->latest()
                    ->take(5)
                    ->get(['id', 'title', 'owner_id', 'created_at', 'is_paid', 'price_cents']),
            ],
            'platform_activity' => [
                'quiz_attempts_today' => QuizAttempt::whereDate('created_at', $today)->count(),
                'new_enrollments_today' => QuizEnrollment::whereDate('created_at', $today)->count() +
                                          CourseEnrollment::whereDate('created_at', $today)->count(),
            ],
            'charts' => [
                'approval_trend' => $this->getApprovalTrendChart(),
                'content_status' => $this->getContentStatusChart(),
            ],
        ];
    }

    /**
     * Get User dashboard statistics
     */
    private function getUserStats($user)
    {
        $wallet = WalletAccount::firstOrCreate(['user_id' => $user->id]);
        $thisMonth = Carbon::now()->startOfMonth();

        // Get user's content
        $myQuizzes = Quiz::where('owner_id', $user->id)->get();
        $myCourses = Course::where('owner_id', $user->id)->get();

        // Calculate earnings from quiz/course enrollments
        $quizIds = $myQuizzes->pluck('id');
        $courseIds = $myCourses->pluck('id');

        $quizEnrollments = QuizEnrollment::whereIn('quiz_id', $quizIds)->count();
        $courseEnrollments = CourseEnrollment::whereIn('course_id', $courseIds)->count();

        // Estimate revenue (this would normally come from purchase records)
        $quizRevenue = 0; // Placeholder - implement based on your payment system
        $courseRevenue = 0; // Placeholder - implement based on your payment system

        return [
            'role' => 'user',
            'wallet' => [
                'balance' => $wallet->balance_cents / 100,
                'pending_withdrawals' => 0, // Placeholder - implement withdrawal_requests table if needed
            ],
            'my_content' => [
                'total_quizzes' => $myQuizzes->count(),
                'published_quizzes' => $myQuizzes->where('status', 'published')->count(),
                'draft_quizzes' => $myQuizzes->where('status', 'draft')->count(),
                'pending_quizzes' => $myQuizzes->where('status', 'submitted')->count(),
                'total_courses' => $myCourses->count(),
                'published_courses' => $myCourses->where('status', 'approved')->count(),
                'draft_courses' => $myCourses->where('status', 'draft')->count(),
                'pending_courses' => $myCourses->where('status', 'submitted')->count(),
            ],
            'earnings' => [
                'total_quiz_revenue' => $quizRevenue,
                'total_course_revenue' => $courseRevenue,
                'total_revenue' => $quizRevenue + $courseRevenue,
                'revenue_this_month' => $this->getRevenueThisMonth($user->id, $thisMonth),
            ],
            'learning' => [
                'enrolled_quizzes' => QuizEnrollment::where('user_id', $user->id)->count(),
                'enrolled_courses' => CourseEnrollment::where('user_id', $user->id)->count(),
                'completed_attempts' => QuizAttempt::where('user_id', $user->id)
                    ->where('status', 'completed')
                    ->count(),
                'average_score' => QuizAttempt::where('user_id', $user->id)
                    ->where('status', 'completed')
                    ->avg('score') ?? 0,
            ],
            'recent_activity' => [
                'recent_attempts' => QuizAttempt::where('user_id', $user->id)
                    ->with('quiz:id,title')
                    ->latest()
                    ->take(5)
                    ->get(['id', 'quiz_id', 'status', 'score', 'completed_at']),
            ],
            'charts' => [
                'revenue_trend' => $this->getUserRevenueTrendChart($user->id),
                'performance_trend' => $this->getUserPerformanceTrendChart($user->id),
            ],
        ];
    }

    /**
     * Chart data generators
     */
    private function getUserGrowthChart()
    {
        $data = User::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('COUNT(*) as count')
        )
        ->where('created_at', '>=', Carbon::now()->subDays(30))
        ->groupBy('date')
        ->orderBy('date')
        ->get();

        return $data->map(fn ($item) => [
            'date' => Carbon::parse($item->date)->format('M d'),
            'users' => $item->count,
        ]);
    }

    private function getRevenueTrendChart()
    {
        $data = PlatformRevenue::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('SUM(amount_cents) as total')
        )
        ->where('created_at', '>=', Carbon::now()->subDays(30))
        ->groupBy('date')
        ->orderBy('date')
        ->get();

        return $data->map(fn ($item) => [
            'date' => Carbon::parse($item->date)->format('M d'),
            'revenue' => $item->total / 100,
        ]);
    }

    private function getContentDistributionChart()
    {
        return [
            ['name' => 'Published Quizzes', 'value' => Quiz::where('status', 'published')->count()],
            ['name' => 'Published Courses', 'value' => Course::where('status', 'approved')->count()],
            ['name' => 'Pending Quizzes', 'value' => Quiz::where('status', 'submitted')->count()],
            ['name' => 'Pending Courses', 'value' => Course::where('status', 'submitted')->count()],
        ];
    }

    private function getApprovalTrendChart()
    {
        $data = DB::table('quizzes')
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(CASE WHEN status = "submitted" THEN 1 ELSE 0 END) as pending'),
                DB::raw('SUM(CASE WHEN status = "published" THEN 1 ELSE 0 END) as approved')
            )
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return $data->map(fn ($item) => [
            'date' => Carbon::parse($item->date)->format('M d'),
            'pending' => $item->pending,
            'approved' => $item->approved,
        ]);
    }

    private function getContentStatusChart()
    {
        return [
            ['status' => 'Published Quizzes', 'count' => Quiz::where('status', 'published')->count()],
            ['status' => 'Draft Quizzes', 'count' => Quiz::where('status', 'draft')->count()],
            ['status' => 'Pending Quizzes', 'count' => Quiz::where('status', 'submitted')->count()],
            ['status' => 'Published Courses', 'count' => Course::where('status', 'approved')->count()],
            ['status' => 'Draft Courses', 'count' => Course::where('status', 'draft')->count()],
            ['status' => 'Pending Courses', 'count' => Course::where('status', 'submitted')->count()],
        ];
    }

    private function getUserRevenueTrendChart($userId)
    {
        // Get revenue from wallet transactions (credits that represent earnings)
        $data = DB::table('wallet_transactions')
            ->select(
                DB::raw('DATE(created_at) as date'),
                DB::raw('SUM(CASE WHEN amount_cents > 0 AND type IN ("purchase", "enrollment") THEN amount_cents ELSE 0 END) as revenue')
            )
            ->where('user_id', $userId)
            ->where('created_at', '>=', Carbon::now()->subDays(30))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        return $data->map(fn ($item) => [
            'date' => Carbon::parse($item->date)->format('M d'),
            'revenue' => $item->revenue / 100,
        ]);
    }

    private function getUserPerformanceTrendChart($userId)
    {
        $data = QuizAttempt::select(
            DB::raw('DATE(created_at) as date'),
            DB::raw('AVG(score) as avg_score'),
            DB::raw('COUNT(*) as attempts')
        )
        ->where('user_id', $userId)
        ->where('status', 'completed')
        ->where('created_at', '>=', Carbon::now()->subDays(30))
        ->groupBy('date')
        ->orderBy('date')
        ->get();

        return $data->map(fn ($item) => [
            'date' => Carbon::parse($item->date)->format('M d'),
            'score' => round($item->avg_score, 2),
            'attempts' => $item->attempts,
        ]);
    }

    private function getRevenueThisMonth($userId, $startDate)
    {
        // Calculate revenue from wallet transactions
        $revenue = DB::table('wallet_transactions')
            ->where('user_id', $userId)
            ->where('created_at', '>=', $startDate)
            ->whereIn('type', ['purchase', 'enrollment'])
            ->where('amount_cents', '>', 0)
            ->sum('amount_cents') / 100;

        return $revenue;
    }
}
