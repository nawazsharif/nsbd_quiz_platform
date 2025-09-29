<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'Technology'],
            ['name' => 'Business'],
            ['name' => 'Design'],
            ['name' => 'Science'],
            ['name' => 'Language'],
        ];

        foreach ($categories as $cat) {
            $slug = Str::slug($cat['name']);
            Category::updateOrCreate(['slug' => $slug], [
                'name' => $cat['name'],
                'slug' => $slug,
            ]);
        }
    }
}
