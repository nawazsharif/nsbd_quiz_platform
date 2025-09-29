<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CourseBookmark extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'course_id',
    ];

    protected $casts = [
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user that owns the bookmark.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the course that is bookmarked.
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * Check if a user has bookmarked a specific course.
     */
    public static function isBookmarked(int $userId, int $courseId): bool
    {
        return static::where('user_id', $userId)
            ->where('course_id', $courseId)
            ->exists();
    }

    /**
     * Toggle bookmark for a user and course.
     */
    public static function toggle(int $userId, int $courseId): array
    {
        $bookmark = static::where('user_id', $userId)
            ->where('course_id', $courseId)
            ->first();

        if ($bookmark) {
            $bookmark->delete();
            return ['bookmarked' => false, 'message' => 'Bookmark removed'];
        } else {
            static::create([
                'user_id' => $userId,
                'course_id' => $courseId,
            ]);
            return ['bookmarked' => true, 'message' => 'Course bookmarked'];
        }
    }
}