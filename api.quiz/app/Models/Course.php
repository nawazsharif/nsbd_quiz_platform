<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Course extends Model
{
    /** @use HasFactory<\Database\Factories\CourseFactory> */
    use HasFactory;

    protected $fillable = [
        'owner_id', 'category_id', 'title', 'slug', 'summary', 'description', 'cover_url',
        'is_paid', 'price_cents', 'visibility', 'status', 'rejection_note', 'rating_avg', 'rating_count',
    ];

    public function owner()
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function reviews()
    {
        return $this->hasMany(CourseReview::class);
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

