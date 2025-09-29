<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CourseEnrollment extends Model
{
    use HasFactory;

    protected $fillable = [
        'course_id',
        'user_id',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user that owns the enrollment.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the course that is enrolled.
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * Get the progress records for this enrollment.
     */
    public function progress(): HasMany
    {
        return $this->hasMany(CourseProgress::class, 'course_id', 'course_id')
            ->where('user_id', $this->user_id);
    }

    /**
     * Check if a user is enrolled in a specific course.
     */
    public static function isEnrolled(int $userId, int $courseId): bool
    {
        return static::where('user_id', $userId)
            ->where('course_id', $courseId)
            ->exists();
    }

    /**
     * Enroll a user in a course.
     */
    public static function enroll(int $userId, int $courseId): self
    {
        return static::firstOrCreate([
            'user_id' => $userId,
            'course_id' => $courseId,
        ]);
    }

    /**
     * Get enrollment with progress data.
     */
    public function getProgressData(): array
    {
        return CourseProgress::getCourseProgress($this->user_id, $this->course_id);
    }
}

