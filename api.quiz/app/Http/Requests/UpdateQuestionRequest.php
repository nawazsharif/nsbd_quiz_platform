<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateQuestionRequest extends FormRequest
{
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
        $type = $this->input('type');
        $rules = [
            'type' => 'sometimes|in:mcq,true_false,short_desc',
            'order_index' => 'sometimes|integer|min:1',
            'points' => 'sometimes|integer|min:1',
        ];

        if ($type === 'mcq' || $this->has('options')) {
            $rules = array_merge($rules, [
                'text' => 'sometimes|required|string',
                'multiple_correct' => 'sometimes|boolean',
                'options' => 'sometimes|array|min:2',
                'options.*.text' => 'required_with:options|string',
                'options.*.is_correct' => 'required_with:options|boolean',
            ]);
        } elseif ($type === 'true_false') {
            $rules = array_merge($rules, [
                'text' => 'sometimes|required|string',
                'correct_boolean' => 'sometimes|required|boolean',
            ]);
        } elseif ($type === 'short_desc') {
            $rules = array_merge($rules, [
                'prompt' => 'sometimes|required|string',
                'sample_answer' => 'nullable|string',
                'requires_manual_grading' => 'in:1,true',
            ]);
        }

        return $rules;
    }
}
