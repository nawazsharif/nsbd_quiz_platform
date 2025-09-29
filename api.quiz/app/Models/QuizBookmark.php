<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class QuizBookmark extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'quiz_id',
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
     * Get the quiz that is bookmarked.
     */
    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }

    /**
     * Check if a user has bookmarked a specific quiz.
     */
    public static function isBookmarked(int $userId, int $quizId): bool
    {
        return static::where('user_id', $userId)
            ->where('quiz_id', $quizId)
            ->exists();
    }

    /**
     * Toggle bookmark for a user and quiz.
     */
    public static function toggle(int $userId, int $quizId): array
    {
        $bookmark = static::where('user_id', $userId)
            ->where('quiz_id', $quizId)
            ->first();

        if ($bookmark) {
            $bookmark->delete();
            return ['bookmarked' => false, 'message' => 'Bookmark removed'];
        } else {
            static::create([
                'user_id' => $userId,
                'quiz_id' => $quizId,
            ]);
            return ['bookmarked' => true, 'message' => 'Quiz bookmarked'];
        }
    }
}