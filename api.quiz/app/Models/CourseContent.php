<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CourseContent extends Model
{
    protected $fillable = ['course_id', 'type', 'title', 'order_index', 'duration_seconds', 'payload'];
    protected $casts = [
        'payload' => 'array',
    ];

    public function course()
    {
        return $this->belongsTo(Course::class);
    }
}

