<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PlatformRevenue extends Model
{
    protected $fillable = ['quiz_id', 'course_id', 'buyer_id', 'amount_cents', 'source'];

    /**
     * Get the quiz associated with this revenue.
     */
    public function quiz(): BelongsTo
    {
        return $this->belongsTo(Quiz::class);
    }

    /**
     * Get the course associated with this revenue.
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * Get the buyer (user) who made the purchase.
     */
    public function buyer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'buyer_id');
    }

    /**
     * Scope: Filter by source type.
     */
    public function scopeOfSource($query, string|array $source)
    {
        if (is_array($source)) {
            return $query->whereIn('source', $source);
        }
        return $query->where('source', $source);
    }

    /**
     * Scope: Filter by date range.
     */
    public function scopeDateRange($query, ?string $from, ?string $to)
    {
        if ($from) {
            $query->where('created_at', '>=', $from);
        }
        if ($to) {
            $query->where('created_at', '<=', $to);
        }
        return $query;
    }

    /**
     * Scope: Filter by creator (quiz or course owner).
     */
    public function scopeByCreator($query, int $creatorId)
    {
        return $query->where(function ($q) use ($creatorId) {
            $q->whereHas('quiz', function ($q2) use ($creatorId) {
                $q2->where('owner_id', $creatorId);
            })->orWhereHas('course', function ($q2) use ($creatorId) {
                $q2->where('owner_id', $creatorId);
            });
        });
    }
}
