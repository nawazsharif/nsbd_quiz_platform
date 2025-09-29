<?php

namespace Database\Seeders;

use App\Models\Tag;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class TagSeeder extends Seeder
{
    public function run(): void
    {
        $tags = [
            'javascript',
            'php',
            'react',
            'laravel',
            'design-patterns',
            'algorithms',
            'data-structures',
        ];

        foreach ($tags as $name) {
            $slug = Str::slug($name);
            Tag::updateOrCreate(['slug' => $slug], [
                'name' => Str::title(str_replace('-', ' ', $name)),
                'slug' => $slug,
            ]);
        }
    }
}
