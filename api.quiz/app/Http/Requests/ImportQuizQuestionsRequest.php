<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ImportQuizQuestionsRequest extends FormRequest
{
    public function authorize(): bool
    {
        return auth()->check();
    }

    public function rules(): array
    {
        return [
            'file' => 'required|file|max:10240|mimes:csv,txt,xlsx,xls',
            'default_type' => 'nullable|in:mcq,true_false,short_desc',
            'default_points' => 'nullable|integer|min:1',
            'start_order_index' => 'nullable|integer|min:1',
        ];
    }
}
