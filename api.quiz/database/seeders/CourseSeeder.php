<?php

namespace Database\Seeders;

use App\Models\Course;
use App\Models\CourseContent;
use App\Models\User;
use Illuminate\Database\Seeder;

class CourseSeeder extends Seeder
{
    public function run(): void
    {
        $owner = User::first() ?? User::factory()->create();

        // Free course
        $free = Course::factory()->for($owner, 'owner')->create([
            'title' => 'Free Starter Course',
            'is_paid' => false,
            'status' => 'approved',
        ]);
        CourseContent::create([
            'course_id' => $free->id,
            'type' => 'text',
            'title' => 'Welcome',
            'order_index' => 1,
            'payload' => ['body' => 'Welcome to the free course!'],
        ]);

        // Paid course
        $paid = Course::factory()->for($owner, 'owner')->create([
            'title' => 'Professional Course',
            'is_paid' => true,
            'price_cents' => 2000,
            'status' => 'approved',
        ]);
        CourseContent::create([
            'course_id' => $paid->id,
            'type' => 'video',
            'title' => 'Introduction',
            'order_index' => 1,
            'payload' => ['provider' => 'youtube', 'url' => 'https://youtu.be/dQw4w9WgXcQ'],
        ]);
    }
}

