<?php

namespace App\Http\Middleware;

use App\Models\QuizAttempt;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Symfony\Component\HttpFoundation\Response;

class QuizAttemptSecurityMiddleware
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = Auth::user();

        if (!$user) {
            return response()->json([
                'success' => false,
                'message' => 'Unauthorized'
            ], 401);
        }

        // Rate limiting for quiz attempts
        $this->enforceRateLimit($request, $user->id);

        // Validate attempt ownership for specific routes
        if ($request->route('attempt') || $request->route('id')) {
            $this->validateAttemptOwnership($request, $user->id);
        }

        // Log suspicious activity
        $this->logSuspiciousActivity($request, $user->id);

        // Add security headers
        $response = $next($request);

        if ($response instanceof \Illuminate\Http\JsonResponse) {
            $response->headers->set('X-Content-Type-Options', 'nosniff');
            $response->headers->set('X-Frame-Options', 'DENY');
            $response->headers->set('X-XSS-Protection', '1; mode=block');
        }

        return $response;
    }

    /**
     * Enforce rate limiting for quiz attempts.
     */
    private function enforceRateLimit(Request $request, int $userId): void
    {
        // Skip rate limiting for enrollment status checks and viewing results
        $path = $request->path();
        if (strpos($path, 'enrollment-status') !== false ||
            strpos($path, 'results') !== false ||
            $request->method() === 'GET') {
            return;
        }

        $key = "quiz_attempt_rate_limit:{$userId}";
        $maxAttempts = 30; // Increased from 10 to 30 requests per minute
        $decayMinutes = 1;

        $attempts = Cache::get($key, 0);

        if ($attempts >= $maxAttempts) {
            abort(429, 'Too many quiz attempt requests. Please try again later.');
        }

        Cache::put($key, $attempts + 1, now()->addMinutes($decayMinutes));
    }

    /**
     * Validate that the user owns the quiz attempt.
     */
    private function validateAttemptOwnership(Request $request, int $userId): void
    {
        $routeParam = $request->route('attempt') ?? $request->route('id');

        if ($routeParam instanceof QuizAttempt) {
            $attempt = $routeParam;
        } elseif ($routeParam) {
            $attempt = QuizAttempt::find($routeParam);
        } else {
            $attempt = null;
        }

        if ($attempt) {
            if ($attempt->user_id !== $userId) {
                Log::warning('Unauthorized quiz attempt access', [
                    'user_id' => $userId,
                    'attempt_id' => $attempt->id,
                    'actual_owner' => $attempt->user_id,
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent()
                ]);

                abort(403, 'Unauthorized access to quiz attempt');
            }
        }
    }

    /**
     * Log suspicious activity patterns.
     */
    private function logSuspiciousActivity(Request $request, int $userId): void
    {
        $suspiciousPatterns = [
            // Multiple rapid submissions
            'rapid_submissions' => $this->detectRapidSubmissions($request, $userId),
            // Unusual timing patterns
            'timing_anomalies' => $this->detectTimingAnomalies($request, $userId),
            // Multiple concurrent attempts
            'concurrent_attempts' => $this->detectConcurrentAttempts($request, $userId),
        ];

        foreach ($suspiciousPatterns as $pattern => $detected) {
            if ($detected) {
                Log::warning("Suspicious quiz activity detected: {$pattern}", [
                    'user_id' => $userId,
                    'pattern' => $pattern,
                    'ip' => $request->ip(),
                    'user_agent' => $request->userAgent(),
                    'route' => $request->route()->getName(),
                    'timestamp' => now()
                ]);
            }
        }
    }

    /**
     * Detect rapid submissions that might indicate automated behavior.
     */
    private function detectRapidSubmissions(Request $request, int $userId): bool
    {
        if (!$request->routeIs('*.submit')) {
            return false;
        }

        $key = "rapid_submissions:{$userId}";
        $submissions = Cache::get($key, []);
        $now = now()->timestamp;

        // Remove submissions older than 1 minute
        $submissions = array_filter($submissions, function($timestamp) use ($now) {
            return ($now - $timestamp) < 60;
        });

        $submissions[] = $now;
        Cache::put($key, $submissions, now()->addMinutes(5));

        // Flag if more than 3 submissions in 1 minute
        return count($submissions) > 3;
    }

    /**
     * Detect unusual timing patterns.
     */
    private function detectTimingAnomalies(Request $request, int $userId): bool
    {
        if (!$request->has('time_spent_seconds')) {
            return false;
        }

        $timeSpent = $request->input('time_spent_seconds');

        // Flag extremely fast completion (less than 5 seconds per question)
        if ($request->has('answers') && is_array($request->input('answers'))) {
            $questionCount = count($request->input('answers'));
            $averageTimePerQuestion = $questionCount > 0 ? $timeSpent / $questionCount : 0;

            return $averageTimePerQuestion < 5;
        }

        return false;
    }

    /**
     * Detect multiple concurrent attempts.
     */
    private function detectConcurrentAttempts(Request $request, int $userId): bool
    {
        if (!($request->routeIs('quiz-attempts.start') || $request->routeIs('quizzes.attempts.store'))) {
            return false;
        }

        $activeAttempts = QuizAttempt::where('user_id', $userId)
            ->where('status', 'in_progress')
            ->count();

        // Flag if user has more than 2 active attempts
        return $activeAttempts > 2;
    }
}
