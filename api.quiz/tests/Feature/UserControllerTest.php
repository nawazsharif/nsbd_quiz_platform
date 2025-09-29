<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class UserControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create permissions
        // Create permissions for sanctum guard
        $permissions = ['view users', 'create users', 'edit users', 'delete users'];
        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'sanctum']);
        }
        
        // Create roles
        $superadmin = Role::create(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        $admin = Role::create(['name' => 'admin', 'guard_name' => 'sanctum']);
        $user = Role::create(['name' => 'user', 'guard_name' => 'sanctum']);
        
        // Assign permissions to roles
        $superadmin->givePermissionTo(['view users', 'create users', 'edit users', 'delete users']);
        $admin->givePermissionTo(['view users', 'create users', 'edit users']);
        // User role has no permissions by default
    }

    public function test_unauthenticated_user_cannot_access_users_endpoint()
    {
        $response = $this->getJson('/api/users');
        $response->assertStatus(401);
    }

    public function test_user_with_view_permission_can_list_users()
    {
        $user = User::factory()->create();
        $user->assignRole('admin'); // Admin has view users permission
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/users');
        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        '*' => ['id', 'name', 'email', 'created_at', 'updated_at']
                    ],
                    'current_page',
                    'per_page',
                    'total',
                    'links'
                ]);
    }

    public function test_user_without_view_permission_cannot_list_users()
    {
        $user = User::factory()->create();
        $user->assignRole('user');
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/users');
        $response->assertStatus(403);
    }

    public function test_user_with_create_permission_can_create_user()
    {
        $user = User::factory()->create();
        $user->assignRole('admin');
        Sanctum::actingAs($user);

        $userData = [
            'name' => $this->faker->name,
            'email' => $this->faker->unique()->safeEmail,
            'password' => 'password123'
        ];

        $response = $this->postJson('/api/users', $userData);
        $response->assertStatus(201)
                ->assertJsonStructure([
                    'id', 'name', 'email', 'created_at', 'updated_at', 'roles'
                ]);

        $this->assertDatabaseHas('users', [
            'name' => $userData['name'],
            'email' => $userData['email']
        ]);
    }

    public function test_user_without_create_permission_cannot_create_user()
    {
        $user = User::factory()->create();
        $user->assignRole('user');
        Sanctum::actingAs($user);

        $userData = [
            'name' => $this->faker->name,
            'email' => $this->faker->unique()->safeEmail,
            'password' => 'password123'
        ];

        $response = $this->postJson('/api/users', $userData);
        $response->assertStatus(403);
    }

    public function test_create_user_validation_fails_with_invalid_data()
    {
        $user = User::factory()->create();
        $user->assignRole('admin');
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/users', [
            'name' => '',
            'email' => 'invalid-email',
            'password' => '123'
        ]);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['name', 'email', 'password']);
    }

    public function test_user_with_view_permission_can_show_user()
    {
        $authUser = User::factory()->create();
        $authUser->assignRole('admin'); // Admin has view users permission
        Sanctum::actingAs($authUser);

        $targetUser = User::factory()->create();
        $targetUser->assignRole('user');

        $response = $this->getJson("/api/users/{$targetUser->id}");
        $response->assertStatus(200)
                ->assertJsonStructure([
                    'id', 'name', 'email', 'created_at', 'updated_at', 'roles'
                ]);
    }

    public function test_user_with_edit_permission_can_update_user()
    {
        $user = User::factory()->create();
        $user->assignRole('admin'); // Admin has edit users permission
        Sanctum::actingAs($user);

        $targetUser = User::factory()->create();
        $targetUser->assignRole('user');

        $updateData = [
            'name' => 'Updated Name',
            'email' => 'updated@example.com'
        ];

        $response = $this->putJson("/api/users/{$targetUser->id}", $updateData);
        $response->assertStatus(200)
                ->assertJson([
                    'name' => 'Updated Name',
                    'email' => 'updated@example.com'
                ]);

        $this->assertDatabaseHas('users', [
            'id' => $targetUser->id,
            'name' => 'Updated Name',
            'email' => 'updated@example.com'
        ]);
    }

    public function test_user_without_edit_permission_cannot_update_user()
    {
        $user = User::factory()->create();
        $user->assignRole('user');
        Sanctum::actingAs($user);

        $targetUser = User::factory()->create();

        $response = $this->putJson("/api/users/{$targetUser->id}", [
            'name' => 'Updated Name'
        ]);
        $response->assertStatus(403);
    }

    public function test_user_with_delete_permission_can_delete_user()
    {
        $user = User::factory()->create();
        $user->assignRole('superadmin');
        Sanctum::actingAs($user);

        $targetUser = User::factory()->create();

        $response = $this->deleteJson("/api/users/{$targetUser->id}");
        $response->assertStatus(204);

        $this->assertDatabaseMissing('users', [
            'id' => $targetUser->id
        ]);
    }

    public function test_user_can_be_created_with_multiple_roles()
    {
        $user = User::factory()->create();
        $user->assignRole('admin');
        Sanctum::actingAs($user);

        $userData = [
            'name' => $this->faker->name,
            'email' => $this->faker->unique()->safeEmail,
            'password' => 'password123',
            'roles' => ['admin', 'user']
        ];

        $response = $this->postJson('/api/users', $userData);
        $response->assertStatus(201);

        $createdUser = User::where('email', $userData['email'])->first();
        $this->assertTrue($createdUser->hasRole(['admin', 'user']));
    }

    public function test_user_roles_can_be_updated()
    {
        $user = User::factory()->create();
        $user->assignRole('superadmin');
        Sanctum::actingAs($user);

        $targetUser = User::factory()->create();
        $targetUser->assignRole('user');

        $response = $this->putJson("/api/users/{$targetUser->id}", [
            'roles' => ['admin']
        ]);

        $response->assertStatus(200);
        $targetUser->refresh();
        $this->assertTrue($targetUser->hasRole('admin'));
        $this->assertFalse($targetUser->hasRole('user'));
    }

    public function test_pagination_works_correctly()
    {
        $user = User::factory()->create();
        $user->assignRole('admin'); // Admin has view users permission
        Sanctum::actingAs($user);

        // Create multiple users
        User::factory()->count(15)->create();

        $response = $this->getJson('/api/users?per_page=10');
        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data',
                    'current_page',
                    'per_page',
                    'total',
                    'last_page',
                    'links'
                ]);

        $this->assertCount(10, $response->json('data'));
    }
}
