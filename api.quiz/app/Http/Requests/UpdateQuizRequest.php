<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateQuizRequest extends FormRequest
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
        return auth()->check();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => 'sometimes|required|string|max:200',
            'description' => 'sometimes|nullable|string',
            'category_id' => 'sometimes|nullable|integer|exists:categories,id',
            'difficulty' => 'sometimes|in:easy,medium,hard',
            'is_paid' => 'sometimes|boolean',
            'price_cents' => 'sometimes|nullable|integer|min:0',
            'timer_seconds' => 'sometimes|nullable|integer|min:10',
            'randomize_questions' => 'sometimes|boolean',
            'randomize_answers' => 'sometimes|boolean',
            'allow_multiple_attempts' => 'sometimes|boolean',
            'max_attempts' => 'sometimes|nullable|integer|min:1',
            'visibility' => 'sometimes|in:public,private',
            // Allow workflow statuses; actual transitions enforced in controllers
            'status' => 'sometimes|in:draft,published,pending_review,rejected',
            'negative_marking' => 'sometimes|boolean',
            'negative_mark_value' => 'sometimes|nullable|numeric|min:0|required_with:negative_marking',
            'tags' => 'sometimes|nullable|array',
            'tags.*' => 'string|max:50',
        ];
    }
}
