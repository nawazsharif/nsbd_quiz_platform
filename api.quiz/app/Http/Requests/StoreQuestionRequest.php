<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreQuestionRequest extends FormRequest
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
            'type' => 'required|in:mcq,true_false,short_desc',
            'order_index' => 'required|integer|min:1',
            'points' => 'nullable|integer|min:1',
        ];

        if ($type === 'mcq') {
            $rules = array_merge($rules, [
                'text' => 'required|string',
                'multiple_correct' => 'boolean',
                'options' => 'required|array|min:2',
                'options.*.text' => 'required|string',
                'options.*.is_correct' => 'required|boolean',
            ]);
        } elseif ($type === 'true_false') {
            $rules = array_merge($rules, [
                'text' => 'required|string',
                'correct_boolean' => 'required|boolean',
            ]);
        } elseif ($type === 'short_desc') {
            $rules = array_merge($rules, [
                'prompt' => 'required|string',
                'sample_answer' => 'nullable|string',
                'requires_manual_grading' => 'in:1,true',
            ]);
        }

        return $rules;
    }
}
