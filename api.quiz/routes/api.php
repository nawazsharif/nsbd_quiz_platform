<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SocialAuthController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\RoleController;
use App\Http\Controllers\Api\PermissionController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\QuizController;
use App\Http\Controllers\Api\QuestionController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\WalletController;
use App\Http\Controllers\Api\WithdrawalController;
use App\Http\Controllers\Api\AdminQuizApprovalController;
use App\Http\Controllers\Api\PurchaseController;
use App\Http\Controllers\Api\ReviewController;
use App\Http\Controllers\Api\CourseReviewController;
use App\Http\Controllers\Api\CourseController;
use App\Http\Controllers\Api\CourseContentController;
use App\Http\Controllers\Api\AdminCourseApprovalController;
use App\Http\Controllers\Api\CoursePurchaseController;
use App\Http\Controllers\Api\UploadController;
use App\Http\Controllers\Api\BookmarkController;
use App\Http\Controllers\Api\CourseBookmarkController;
use App\Http\Controllers\Api\CourseEnrollmentController;
use App\Http\Controllers\Api\QuizEnrollmentController;
use App\Http\Controllers\QuizAttemptController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});

// Health check endpoint for Docker
Route::get('/health', function () {
    return response()->json([
        'status' => 'ok',
        'timestamp' => now()->toISOString(),
        'service' => 'quiz-platform-api'
    ]);
});

// Authentication routes (public)
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);

    // Social authentication routes
    Route::prefix('social')->group(function () {
        Route::get('{provider}/redirect', [SocialAuthController::class, 'redirectToProvider']);
        Route::get('{provider}/callback', [SocialAuthController::class, 'handleProviderCallback']);
        Route::post('{provider}/login', [SocialAuthController::class, 'loginWithCode']);
    });

    // Protected auth routes
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('profile', [AuthController::class, 'profile']);
        Route::put('profile', [AuthController::class, 'updateProfile']);
    });
});

// User management routes
Route::apiResource('users', UserController::class)->middleware('auth:sanctum');

// Role management routes
Route::apiResource('roles', RoleController::class)->middleware('auth:sanctum');

// Permission management routes
Route::apiResource('permissions', PermissionController::class)->middleware('auth:sanctum');

// Additional role permission routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('roles/{role}/permissions', [RoleController::class, 'permissions']);
    Route::post('roles/{role}/permissions', [RoleController::class, 'assignPermissions']);
    Route::post('roles/{role}/assign', [RoleController::class, 'assign']);
    Route::post('roles/{role}/revoke', [RoleController::class, 'revoke']);
});

// Category routes: public list/show; write actions protected in controller
Route::apiResource('categories', CategoryController::class);

// Quiz routes: public list/show; create/update/delete require auth and ownership/admin handled in controller
Route::apiResource('quizzes', QuizController::class);
Route::middleware('auth:sanctum')->group(function () {
    Route::post('quizzes/{quiz}/submit', [QuizController::class, 'submit']);
});
Route::apiResource('quizzes.questions', QuestionController::class);

// Course routes
Route::apiResource('courses', CourseController::class);
Route::middleware('auth:sanctum')->group(function () {
    Route::get('courses/{course}/contents', [CourseContentController::class, 'index']);
Route::post('courses/{course}/contents', [CourseContentController::class, 'store']);
Route::get('courses/{course}/contents/{content}', [CourseContentController::class, 'show']);
Route::put('courses/{course}/contents/{content}', [CourseContentController::class, 'update']);
Route::delete('courses/{course}/contents/{content}', [CourseContentController::class, 'destroy']);
    Route::post('courses/{course}/submit', [CourseController::class, 'submit']);
});

// Wallet & Settings
Route::middleware('auth:sanctum')->group(function () {
    Route::get('wallet/balance', [WalletController::class, 'balance']);
    Route::post('wallet/recharge', [WalletController::class, 'recharge']);
    Route::post('wallet/recharge/confirm', [WalletController::class, 'confirm']);

    // Withdrawals
    Route::post('wallet/withdrawals', [WithdrawalController::class, 'requestWithdrawal']);
    Route::get('admin/withdrawals', [WithdrawalController::class, 'adminList']);
    Route::post('admin/withdrawals/{withdrawal}/approve', [WithdrawalController::class, 'approve']);
    Route::post('admin/withdrawals/{withdrawal}/reject', [WithdrawalController::class, 'reject']);

    // Settings (superadmin enforced inside controller via role middleware)
    Route::get('settings/quiz', [SettingsController::class, 'getQuizSettings']);
    Route::put('settings/quiz', [SettingsController::class, 'updateQuizSettings']);
    Route::get('settings/course', [SettingsController::class, 'getCourseSettings']);
    Route::put('settings/course', [SettingsController::class, 'updateCourseSettings']);
    Route::get('settings/payments', [SettingsController::class, 'paymentIndex']);
    Route::put('settings/payments/{provider}', [SettingsController::class, 'paymentUpdate']);

    // Quiz approval
    Route::post('admin/quizzes/{quiz}/approve', [AdminQuizApprovalController::class, 'approve']);
    Route::post('admin/quizzes/{quiz}/reject', [AdminQuizApprovalController::class, 'reject']);

    // Course approval
    Route::post('admin/courses/{course}/approve', [AdminCourseApprovalController::class, 'approve']);
    Route::post('admin/courses/{course}/reject', [AdminCourseApprovalController::class, 'reject']);

    // Enroll/Purchase
    Route::post('quizzes/{quiz}/enroll', [PurchaseController::class, 'enrollOrPurchase']);
    Route::post('courses/{course}/enroll', [CoursePurchaseController::class, 'enrollOrPurchase']);

    // Reviews - protected write operations
    Route::post('quizzes/{quiz}/reviews', [ReviewController::class, 'store']);
    Route::put('quizzes/{quiz}/reviews/{review}', [ReviewController::class, 'update']);
    Route::delete('quizzes/{quiz}/reviews/{review}', [ReviewController::class, 'destroy']);

    // Superadmin moderation
    Route::post('reviews/{review}/hide', [ReviewController::class, 'hide']);

    // Course reviews - protected write
    Route::post('courses/{course}/reviews', [CourseReviewController::class, 'store']);
    Route::put('courses/{course}/reviews/{review}', [CourseReviewController::class, 'update']);
    Route::delete('courses/{course}/reviews/{review}', [CourseReviewController::class, 'destroy']);
    Route::post('course-reviews/{review}/hide', [CourseReviewController::class, 'hide']);

    // Media uploads
    Route::post('uploads', [UploadController::class, 'store']);

    // Bookmarks
    Route::get('bookmarks', [BookmarkController::class, 'index']);
    Route::post('bookmarks/toggle/{quiz}', [BookmarkController::class, 'toggle']);
    Route::get('bookmarks/check/{quiz}', [BookmarkController::class, 'check']);
    Route::delete('bookmarks/{quiz}', [BookmarkController::class, 'destroy']);

    // Course Bookmarks
    Route::get('course-bookmarks', [CourseBookmarkController::class, 'index']);
    Route::post('course-bookmarks/toggle/{course}', [CourseBookmarkController::class, 'toggle']);
    Route::get('course-bookmarks/check/{course}', [CourseBookmarkController::class, 'check']);
    Route::delete('course-bookmarks/{course}', [CourseBookmarkController::class, 'destroy']);
});

// Public reviews listing
Route::get('quizzes/{quiz}/reviews', [ReviewController::class, 'index']);
Route::get('courses/{course}/reviews', [CourseReviewController::class, 'index']);

// Quiz ranking (public but with optional auth for user's in-progress attempts)
Route::get('quizzes/{quiz}/ranking', [App\Http\Controllers\Api\QuizRankingController::class, 'getQuizRanking']);

// Quiz Attempt Routes
Route::middleware(['auth:sanctum', 'quiz.attempt.security'])->group(function () {
    Route::post('quiz-attempts/start', [QuizAttemptController::class, 'start'])->name('quiz-attempts.start'); // legacy support
    Route::post('quizzes/{quiz}/attempts', [QuizAttemptController::class, 'store'])->name('quizzes.attempts.store');
    Route::post('quiz-attempts/{attempt}/resume', [QuizAttemptController::class, 'resume'])->name('quiz-attempts.resume');
    Route::put('quiz-attempts/{attempt}/progress', [QuizAttemptController::class, 'updateProgress'])->name('quiz-attempts.progress');
    Route::post('quiz-attempts/{attempt}/submit', [QuizAttemptController::class, 'submit'])->name('quiz-attempts.submit');
    Route::post('quiz-attempts/{attempt}/abandon', [QuizAttemptController::class, 'abandon'])->name('quiz-attempts.abandon');
    Route::get('user/quiz-attempts', [QuizAttemptController::class, 'getUserAttempts'])->name('quiz-attempts.mine');
    Route::get('quiz-attempts/{attempt}', [QuizAttemptController::class, 'getAttempt'])->name('quiz-attempts.show');
    Route::get('user/attempt-statistics', [QuizAttemptController::class, 'getAttemptStatistics'])->name('quiz-attempts.statistics');

    // Course enrollment and progress routes
    Route::get('course-enrollments', [CourseEnrollmentController::class, 'index']);
    Route::get('courses/{course}/enrollment-status', [CourseEnrollmentController::class, 'checkEnrollment']);
    Route::get('courses/{course}/progress', [CourseEnrollmentController::class, 'getProgress']);
    Route::post('courses/{course}/content/{content}/progress', [CourseEnrollmentController::class, 'updateProgress']);

    // Quiz enrollment status routes
    Route::get('quiz-enrollments', [QuizEnrollmentController::class, 'index']);
    Route::get('quizzes/{quiz}/enrollment-status', [QuizEnrollmentController::class, 'checkEnrollment']);

    // Quiz ranking routes
    Route::get('user/quiz-rankings', [App\Http\Controllers\Api\QuizRankingController::class, 'getUserRankings']);
});

// Additional permission role routes
Route::middleware('auth:sanctum')->group(function () {
    Route::get('permissions/{permission}/roles', [PermissionController::class, 'roles']);
});
