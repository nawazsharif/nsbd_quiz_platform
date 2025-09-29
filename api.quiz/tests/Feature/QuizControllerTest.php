<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\Quiz;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;
use Illuminate\Testing\Fluent\AssertableJson;
use Tests\TestCase;

class QuizControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    public function test_public_can_list_and_show_quizzes()
    {
        $quiz = Quiz::factory()->create();

        $this->getJson('/api/quizzes')->assertStatus(200)
            ->assertJsonStructure(['data']);

        $this->getJson('/api/quizzes/'.$quiz->id)->assertStatus(200)
            ->assertJson(['id' => $quiz->id, 'title' => $quiz->title]);
    }

    public function test_authenticated_user_can_create_quiz()
    {
        $user = User::factory()->create();
        $category = Category::factory()->create();
        Sanctum::actingAs($user);

        $payload = [
            'title' => 'Sample Quiz',
            'description' => 'Desc',
            'difficulty' => 'medium',
            'is_paid' => false,
            'visibility' => 'public',
            'status' => 'draft',
            'category_id' => $category->id,
            'negative_marking' => true,
            'negative_mark_value' => 0.75,
            'tags' => ['php', 'backend'],
        ];

        $response = $this->postJson('/api/quizzes', $payload)
            ->assertStatus(201)
            ->assertJson(fn (AssertableJson $json) => $json
                ->where('title', 'Sample Quiz')
                ->where('negative_marking', true)
                ->where('category_id', $category->id)
                ->where('negative_mark_value', fn ($value) => (float) $value === 0.75)
                ->has('tags', 2)
                ->etc()
            );

        $quizId = $response->json('id');

        $this->assertDatabaseHas('quizzes', [
            'id' => $quizId,
            'title' => 'Sample Quiz',
            'owner_id' => $user->id,
            'negative_marking' => true,
        ]);

        $this->assertDatabaseHas('tags', ['slug' => 'php']);
        $this->assertDatabaseHas('quiz_tag', ['quiz_id' => $quizId]);
    }

    public function test_only_owner_or_admin_can_update_and_delete()
    {
        $owner = User::factory()->create();
        $quiz = Quiz::factory()->for($owner, 'owner')->create();

        // Another user cannot update
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $this->putJson('/api/quizzes/'.$quiz->id, ['title' => 'New'])
            ->assertStatus(403);

        // Owner can update with tags and negative marking
        Sanctum::actingAs($owner);
        $this->putJson('/api/quizzes/'.$quiz->id, [
            'title' => 'Updated',
            'negative_marking' => true,
            'negative_mark_value' => 0.5,
            'tags' => ['advanced'],
        ])
            ->assertStatus(200)
            ->assertJson(fn (AssertableJson $json) => $json
                ->where('title', 'Updated')
                ->where('negative_marking', true)
                ->where('negative_mark_value', fn ($value) => (float) $value === 0.5)
                ->has('tags', 1)
                ->etc()
            );

        // Owner can delete
        $this->deleteJson('/api/quizzes/'.$quiz->id)->assertStatus(204);
        $this->assertDatabaseMissing('quizzes', ['id' => $quiz->id]);
    }
}
