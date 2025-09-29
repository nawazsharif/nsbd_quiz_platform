<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class QuestionOption extends Model
{
    /** @use HasFactory<\Database\Factories\QuestionOptionFactory> */
    use HasFactory;

    protected $fillable = [
        'question_id',
        'text',
        'is_correct',
        'order_index',
    ];

    public function question()
    {
        return $this->belongsTo(Question::class);
    }
}
