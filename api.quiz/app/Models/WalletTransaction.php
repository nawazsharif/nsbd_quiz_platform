<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WalletTransaction extends Model
{
    protected $fillable = [
        'user_id', 'transaction_id', 'type', 'amount_cents', 'status', 'meta'
    ];

    protected $casts = [
        'meta' => 'array',
    ];

    /**
     * Get the user that owns this transaction.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get the related quiz if applicable (from meta).
     * Note: This is a helper, not a true Eloquent relationship since quiz_id is in JSON.
     */
    public function getQuizAttribute()
    {
        if (isset($this->meta['quiz_id'])) {
            return Quiz::find($this->meta['quiz_id']);
        }
        return null;
    }

    /**
     * Get the related course if applicable (from meta).
     * Note: This is a helper, not a true Eloquent relationship since course_id is in JSON.
     */
    public function getCourseAttribute()
    {
        if (isset($this->meta['course_id'])) {
            return Course::find($this->meta['course_id']);
        }
        return null;
    }

    /**
     * Get buyer user if applicable (from meta).
     */
    public function getBuyerAttribute()
    {
        if (isset($this->meta['buyer_id'])) {
            return User::find($this->meta['buyer_id']);
        }
        return null;
    }

    /**
     * Scope: Filter by transaction type.
     */
    public function scopeOfType($query, string|array $type)
    {
        if (is_array($type)) {
            return $query->whereIn('type', $type);
        }
        return $query->where('type', $type);
    }

    /**
     * Scope: Filter by status.
     */
    public function scopeOfStatus($query, string|array $status)
    {
        if (is_array($status)) {
            return $query->whereIn('status', $status);
        }
        return $query->where('status', $status);
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
     * Check if transaction is a credit (money in).
     */
    public function isCredit(): bool
    {
        return in_array($this->meta['direction'] ?? '', ['credit'])
            || in_array($this->type, ['recharge', 'quiz_sale', 'course_sale', 'platform_fee', 'refund']);
    }

    /**
     * Check if transaction is a debit (money out).
     */
    public function isDebit(): bool
    {
        return in_array($this->meta['direction'] ?? '', ['debit'])
            || in_array($this->type, ['quiz_purchase', 'course_purchase', 'withdrawal', 'publishing_fee', 'service_charge']);
    }
}
