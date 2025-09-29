<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreCourseRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return \Illuminate\Support\Facades\Auth::check(); // any authenticated user can create
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
            'summary' => 'nullable|string|max:500',
            'description' => 'nullable|string',
            'cover_url' => 'nullable|url',
            'category_id' => 'nullable|integer|exists:categories,id',
            'is_paid' => 'boolean',
            'price_cents' => 'nullable|integer|min:0',
            'visibility' => 'nullable|in:public,private',
            'status' => 'nullable|in:draft,submitted,approved,rejected',
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