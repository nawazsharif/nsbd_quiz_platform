<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuizEnrollment extends Model
{
    protected $fillable = ['quiz_id', 'user_id'];

    /**
     * Get the user that owns the enrollment.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the quiz that is enrolled.
     */
    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }

    /**
     * Check if a user is enrolled in a specific quiz.
     */
    public static function isEnrolled(int $userId, int $quizId): bool
    {
        return static::where('user_id', $userId)
            ->where('quiz_id', $quizId)
            ->exists();
    }

    /**
     * Enroll a user in a quiz.
     */
    public static function enroll(int $userId, int $quizId): self
    {
        return static::firstOrCreate([
            'user_id' => $userId,
            'quiz_id' => $quizId,
        ]);
    }
}
