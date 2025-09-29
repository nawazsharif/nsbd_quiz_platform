<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreQuizRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->has('negative_marking')) {
            $this->merge([
                'negative_marking' => $this->boolean('negative_marking'),
            ]);
        }
    }

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return auth()->check(); // any authenticated user can create
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => 'required|string|max:200',
            'description' => 'nullable|string',
            'category_id' => 'nullable|integer|exists:categories,id',
            'difficulty' => 'nullable|in:easy,medium,hard',
            'is_paid' => 'boolean',
            'price_cents' => 'nullable|integer|min:0',
            'timer_seconds' => 'nullable|integer|min:10',
            'randomize_questions' => 'boolean',
            'randomize_answers' => 'boolean',
            'allow_multiple_attempts' => 'boolean',
            'max_attempts' => 'nullable|integer|min:1',
            'visibility' => 'nullable|in:public,private',
            'status' => 'nullable|in:draft,published,approved,pending_review,rejected',
            'negative_marking' => 'boolean',
            'negative_mark_value' => 'nullable|numeric|min:0|required_if:negative_marking,true',
            'tags' => 'nullable|array',
            'tags.*' => 'string|max:50',
        ];
    }
}
