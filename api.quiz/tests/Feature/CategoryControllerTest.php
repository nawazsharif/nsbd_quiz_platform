<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class CategoryControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();
        // Seed roles used in app
        Role::create(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        Role::create(['name' => 'admin', 'guard_name' => 'sanctum']);
        Role::create(['name' => 'user', 'guard_name' => 'sanctum']);
    }

    public function test_guest_can_access_categories_list_and_show()
    {
        $category = Category::factory()->create();
        $this->getJson('/api/categories')->assertStatus(200);
        $this->getJson("/api/categories/{$category->id}")->assertStatus(200);
    }

    public function test_authenticated_user_can_list_and_show_categories()
    {
        $category = Category::factory()->create();

        $this->getJson('/api/categories')
            ->assertStatus(200)
            ->assertJsonStructure([
                'data',
                'current_page',
                'per_page',
                'total',
                'last_page',
                'links'
            ]);

        $this->getJson("/api/categories/{$category->id}")
            ->assertStatus(200)
            ->assertJson([
                'id' => $category->id,
                'name' => $category->name,
            ]);
    }

    public function test_only_admin_or_superadmin_can_create_category()
    {
        $user = User::factory()->create();
        $user->assignRole('user');
        Sanctum::actingAs($user);

        $payload = ['name' => 'Programming', 'slug' => 'programming'];
        $this->postJson('/api/categories', $payload)->assertStatus(403);

        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);
        $this->postJson('/api/categories', $payload)
            ->assertStatus(201)
            ->assertJson([
                'name' => 'Programming',
                'slug' => 'programming',
            ]);

        $this->assertDatabaseHas('categories', ['slug' => 'programming']);
    }

    public function test_validation_on_create()
    {
        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);

        $this->postJson('/api/categories', ['name' => ''])
            ->assertStatus(422)
            ->assertJsonValidationErrors(['name']);
    }

    public function test_only_admin_or_superadmin_can_update_and_delete()
    {
        $category = Category::factory()->create();

        $user = User::factory()->create();
        $user->assignRole('user');
        Sanctum::actingAs($user);
        $this->putJson("/api/categories/{$category->id}", ['name' => 'New'])
            ->assertStatus(403);
        $this->deleteJson("/api/categories/{$category->id}")
            ->assertStatus(403);

        $admin = User::factory()->create();
        $admin->assignRole('admin');
        Sanctum::actingAs($admin);
        $this->putJson("/api/categories/{$category->id}", ['name' => 'Updated'])
            ->assertStatus(200)
            ->assertJson(['name' => 'Updated']);
        $this->deleteJson("/api/categories/{$category->id}")
            ->assertStatus(204);

        $this->assertDatabaseMissing('categories', ['id' => $category->id]);
    }
}
