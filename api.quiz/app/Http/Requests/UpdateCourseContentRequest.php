<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class UpdateCourseContentRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return Auth::check();
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'title' => 'sometimes|string|max:200',
            'order_index' => 'sometimes|integer|min:0',
            'duration_seconds' => 'sometimes|nullable|integer|min:0',
            'payload' => 'sometimes|array',
        ];
    }

    /**
     * Get custom error messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.string' => 'Content title must be a valid string.',
            'title.max' => 'Content title cannot exceed 200 characters.',
            'order_index.integer' => 'Order index must be a valid integer.',
            'order_index.min' => 'Order index must be at least 0.',
            'duration_seconds.integer' => 'Duration must be a valid integer.',
            'duration_seconds.min' => 'Duration must be at least 0 seconds.',
            'payload.array' => 'Payload must be a valid array.',
        ];
    }
}