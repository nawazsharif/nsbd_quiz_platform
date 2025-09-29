<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class QuizAttempt extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'quiz_id',
        'status',
        'current_question_index',
        'score',
        'earned_points',
        'penalty_points',
        'correct_answers',
        'incorrect_answers',
        'total_questions',
        'time_spent_seconds',
        'remaining_time_seconds',
        'progress',
        'started_at',
        'completed_at',
    ];

    protected $casts = [
        'progress' => 'array',
        'score' => 'decimal:2',
        'earned_points' => 'decimal:2',
        'penalty_points' => 'decimal:2',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
    ];

    /**
     * Get the user that owns the quiz attempt.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the quiz that this attempt belongs to.
     */
    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }

    /**
     * Get the answers for this quiz attempt.
     */
    public function answers(): HasMany
    {
        return $this->hasMany(AttemptAnswer::class);
    }

    /**
     * Check if the attempt is completed.
     */
    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    /**
     * Check if the attempt is in progress.
     */
    public function isInProgress(): bool
    {
        return $this->status === 'in_progress';
    }

    /**
     * Mark the attempt as completed.
     */
    public function markAsCompleted(): void
    {
        $this->update([
            'status' => 'completed',
            'completed_at' => now(),
        ]);
    }

    /**
     * Mark the attempt as abandoned.
     */
    public function markAsAbandoned(): void
    {
        $this->update([
            'status' => 'abandoned',
        ]);
    }

    /**
     * Calculate and update the score based on correct answers.
     */
    public function calculateScore(): void
    {
        if ($this->total_questions > 0) {
            $this->score = ($this->correct_answers / $this->total_questions) * 100;
            $this->save();
        }
    }

    /**
     * Get the completion percentage.
     */
    public function getCompletionPercentage(): float
    {
        if ($this->total_questions === 0) {
            return 0;
        }
        
        return ($this->current_question_index / $this->total_questions) * 100;
    }

    /**
     * Scope to get attempts by status.
     */
    public function scopeByStatus($query, string $status)
    {
        return $query->where('status', $status);
    }

    /**
     * Scope to get completed attempts.
     */
    public function scopeCompleted($query)
    {
        return $query->where('status', 'completed');
    }

    /**
     * Scope to get in-progress attempts.
     */
    public function scopeInProgress($query)
    {
        return $query->where('status', 'in_progress');
    }
}
