<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Quiz extends Model
{
    /** @use HasFactory<\Database\Factories\QuizFactory> */
    use HasFactory;

    protected $fillable = [
        'owner_id',
        'category_id',
        'title',
        'description',
        'difficulty',
        'is_paid',
        'price_cents',
        'timer_seconds',
        'randomize_questions',
        'randomize_answers',
        'allow_multiple_attempts',
        'max_attempts',
        'visibility',
        'status',
        'negative_marking',
        'negative_mark_value',
        // aggregates
        'rating_avg',
        'rating_count',
    ];

    protected $casts = [
        'is_paid' => 'boolean',
        'randomize_questions' => 'boolean',
        'randomize_answers' => 'boolean',
        'allow_multiple_attempts' => 'boolean',
        'negative_marking' => 'boolean',
        'price_cents' => 'integer',
        'timer_seconds' => 'integer',
        'max_attempts' => 'integer',
        'negative_mark_value' => 'decimal:2',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function questions()
    {
        return $this->hasMany(Question::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function tags()
    {
        return $this->belongsToMany(Tag::class)->withTimestamps();
    }

    public function enrollments()
    {
        return $this->hasMany(QuizEnrollment::class);
    }

    public function attempts()
    {
        return $this->hasMany(QuizAttempt::class);
    }

    public function recalcRating(): void
    {
        $stats = $this->reviews()->where('is_hidden', false)
            ->selectRaw('COUNT(*) as cnt, COALESCE(AVG(rating),0) as avg')->first();
        $this->rating_count = (int) ($stats->cnt ?? 0);
        $this->rating_avg = round((float) ($stats->avg ?? 0), 2);
        $this->save();
    }
}
