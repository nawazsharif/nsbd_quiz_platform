<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateCategoryRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        $user = $this->user() ?? $this->user('sanctum');

        return $user !== null && $user->hasAnyRole(['admin', 'superadmin']);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $categoryId = $this->route('category')?->id ?? $this->route('id');
        return [
            'name' => 'sometimes|required|string|max:120',
            'slug' => 'sometimes|nullable|string|max:140|unique:categories,slug,' . $categoryId,
            'parent_id' => 'sometimes|nullable|integer|exists:categories,id',
        ];
    }
}
