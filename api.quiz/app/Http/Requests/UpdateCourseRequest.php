<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;

class UpdateCourseRequest extends FormRequest
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
            'title' => 'sometimes|required|string|max:200',
            'summary' => 'sometimes|nullable|string|max:500',
            'description' => 'sometimes|nullable|string',
            'cover_url' => 'sometimes|nullable|url',
            'category_id' => 'sometimes|nullable|integer|exists:categories,id',
            'is_paid' => 'sometimes|boolean',
            'price_cents' => 'sometimes|nullable|integer|min:0',
            'visibility' => 'sometimes|in:public,private',
            // Allow workflow statuses; actual transitions enforced in controllers
            'status' => 'sometimes|in:draft,submitted,approved,rejected',
        ];
    }

    /**
     * Get custom messages for validator errors.
     *
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'title.required' => 'The course title is required.',
            'title.max' => 'The course title may not be greater than 200 characters.',
            'summary.max' => 'The course summary may not be greater than 500 characters.',
            'cover_url.url' => 'The cover URL must be a valid URL.',
            'category_id.exists' => 'The selected category does not exist.',
            'price_cents.min' => 'The price must be at least 0.',
            'visibility.in' => 'The visibility must be either public or private.',
            'status.in' => 'The status must be one of: draft, submitted, approved, rejected.',
        ];
    }
}