<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourseProgress extends Model
{
    use HasFactory;

    protected $table = 'course_progress';

    protected $fillable = [
        'user_id',
        'course_id',
        'course_content_id',
        'status',
        'progress_percentage',
        'started_at',
        'completed_at',
        'last_activity_at',
        'metadata',
    ];

    protected $casts = [
        'progress_percentage' => 'integer',
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'last_activity_at' => 'datetime',
        'metadata' => 'array',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user that owns the progress.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the course this progress belongs to.
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * Get the course content this progress tracks.
     */
    public function courseContent(): BelongsTo
    {
        return $this->belongsTo(CourseContent::class);
    }

    /**
     * Mark content as started.
     */
    public function markAsStarted(): void
    {
        $this->update([
            'status' => 'in_progress',
            'started_at' => now(),
            'last_activity_at' => now(),
        ]);
    }

    /**
     * Mark content as completed.
     */
    public function markAsCompleted(): void
    {
        $this->update([
            'status' => 'completed',
            'progress_percentage' => 100,
            'completed_at' => now(),
            'last_activity_at' => now(),
        ]);
    }

    /**
     * Update progress percentage.
     */
    public function updateProgress(int $percentage): void
    {
        $this->update([
            'progress_percentage' => min(100, max(0, $percentage)),
            'last_activity_at' => now(),
            'status' => $percentage >= 100 ? 'completed' : 'in_progress',
            'completed_at' => $percentage >= 100 ? now() : null,
        ]);
    }

    /**
     * Get overall course progress for a user.
     */
    public static function getCourseProgress(int $userId, int $courseId): array
    {
        $totalContents = CourseContent::where('course_id', $courseId)->count();
        
        if ($totalContents === 0) {
            return [
                'total_contents' => 0,
                'completed_contents' => 0,
                'progress_percentage' => 0,
                'status' => 'not_started',
            ];
        }

        $completedContents = static::where('user_id', $userId)
            ->where('course_id', $courseId)
            ->where('status', 'completed')
            ->count();

        $progressPercentage = round(($completedContents / $totalContents) * 100);
        
        $status = 'not_started';
        if ($completedContents > 0 && $completedContents < $totalContents) {
            $status = 'in_progress';
        } elseif ($completedContents === $totalContents) {
            $status = 'completed';
        }

        return [
            'total_contents' => $totalContents,
            'completed_contents' => $completedContents,
            'progress_percentage' => $progressPercentage,
            'status' => $status,
        ];
    }
}