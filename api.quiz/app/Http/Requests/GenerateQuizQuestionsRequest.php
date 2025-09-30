<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class GenerateQuizQuestionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        $max = max(1, (int) config('ai.max_questions', 20));

        return [
            'file' => 'required|file|max:10240|mimes:pdf,jpg,jpeg,png,gif,webp',
            'count' => "nullable|integer|min:1|max:{$max}",
            'question_type' => 'nullable|in:mcq,true_false,short_desc',
            'difficulty' => 'nullable|in:easy,medium,hard',
        ];
    }
}
