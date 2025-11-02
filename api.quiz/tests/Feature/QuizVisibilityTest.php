<?php

namespace Tests\Feature;

use App\Models\Quiz;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class QuizVisibilityTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_public_listing_excludes_unpublished_or_private_quizzes(): void
    {
        $published = Quiz::factory()->create(['status' => 'published', 'visibility' => 'public']);
        $draft = Quiz::factory()->create(['status' => 'draft', 'visibility' => 'public']);
        $private = Quiz::factory()->create(['status' => 'published', 'visibility' => 'private']);

        $response = $this->getJson('/api/quizzes');

        $response->assertOk()
            ->assertJsonFragment(['id' => $published->id])
            ->assertJsonMissing(['id' => $draft->id])
            ->assertJsonMissing(['id' => $private->id]);
    }

    public function test_owner_can_view_unpublished_quiz(): void
    {
        $owner = User::factory()->create();
        $quiz = Quiz::factory()->for($owner, 'owner')->create(['status' => 'draft']);

        $response = $this->actingAs($owner, 'sanctum')->getJson("/api/quizzes/{$quiz->id}");

        $response->assertOk()->assertJsonPath('id', $quiz->id);
    }

    public function test_other_user_cannot_view_unpublished_quiz(): void
    {
        $owner = User::factory()->create();
        $quiz = Quiz::factory()->for($owner, 'owner')->create(['status' => 'draft']);
        $other = User::factory()->create();

        $response = $this->actingAs($other, 'sanctum')->getJson("/api/quizzes/{$quiz->id}");

        $response->assertStatus(404);
    }

    public function test_admin_can_view_unpublished_quiz(): void
    {
        $this->ensureRoleExists('admin');

        $admin = User::factory()->create();
        $admin->assignRole('admin');

        $quiz = Quiz::factory()->create(['status' => 'draft']);

        $response = $this->actingAs($admin, 'sanctum')->getJson("/api/quizzes/{$quiz->id}");

        $response->assertOk()->assertJsonPath('id', $quiz->id);
    }

    public function test_public_cannot_view_private_published_quiz(): void
    {
        $quiz = Quiz::factory()->create(['status' => 'published', 'visibility' => 'private']);

        $response = $this->getJson("/api/quizzes/{$quiz->id}");

        $response->assertStatus(404);
    }

    private function ensureRoleExists(string $name): Role
    {
        return Role::firstOrCreate(['name' => $name, 'guard_name' => 'sanctum']);
    }
}
