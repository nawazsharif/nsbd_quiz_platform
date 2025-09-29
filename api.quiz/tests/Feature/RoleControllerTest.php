<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class RoleControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create permissions
        Permission::create(['name' => 'view roles']);
        Permission::create(['name' => 'create roles']);
        Permission::create(['name' => 'edit roles']);
        Permission::create(['name' => 'delete roles']);
        Permission::create(['name' => 'assign roles']);
        
        // Create permissions for sanctum guard
        $permissions = ['view roles', 'create roles', 'edit roles', 'delete roles', 'assign roles'];
        foreach ($permissions as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'sanctum']);
        }
        
        // Create roles
        $superadmin = Role::create(['name' => 'superadmin', 'guard_name' => 'sanctum']);
        $admin = Role::create(['name' => 'admin', 'guard_name' => 'sanctum']);
        $user = Role::create(['name' => 'user', 'guard_name' => 'sanctum']);
        
        // Assign permissions to roles
        $superadmin->givePermissionTo(['view roles', 'create roles', 'edit roles', 'delete roles', 'assign roles']);
        $admin->givePermissionTo(['view roles', 'create roles', 'edit roles', 'assign roles']);
        $user->givePermissionTo(['view roles']);
    }

    public function test_unauthenticated_user_cannot_access_roles_endpoint()
    {
        $response = $this->getJson('/api/roles');
        $response->assertStatus(401);
    }

    public function test_user_with_view_permission_can_list_roles()
    {
        $user = User::factory()->create();
        $user->assignRole('user');
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/roles');
        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        '*' => ['id', 'name', 'guard_name', 'created_at', 'updated_at', 'permissions']
                    ],
                    'current_page',
                    'per_page',
                    'total',
                    'links'
                ]);
    }

    public function test_user_without_view_permission_cannot_list_roles()
    {
        $user = User::factory()->create();
        // Don't assign any role/permission
        Sanctum::actingAs($user);

        $response = $this->getJson('/api/roles');
        $response->assertStatus(403);
    }

    public function test_user_with_create_permission_can_create_role()
    {
        $user = User::factory()->create();
        $user->assignRole('admin');
        Sanctum::actingAs($user);

        $roleData = [
            'name' => 'test-role',
            'permissions' => ['view roles']
        ];

        $response = $this->postJson('/api/roles', $roleData);
        $response->assertStatus(201)
                ->assertJsonStructure([
                    'id', 'name', 'guard_name', 'created_at', 'updated_at', 'permissions'
                ]);

        $this->assertDatabaseHas('roles', [
            'name' => 'test-role'
        ]);
    }

    public function test_user_without_create_permission_cannot_create_role()
    {
        $user = User::factory()->create();
        $user->assignRole('user');
        Sanctum::actingAs($user);

        $roleData = [
            'name' => 'test-role'
        ];

        $response = $this->postJson('/api/roles', $roleData);
        $response->assertStatus(403);
    }

    public function test_create_role_validation_fails_with_invalid_data()
    {
        $user = User::factory()->create();
        $user->assignRole('admin');
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/roles', [
            'name' => '', // Empty name
        ]);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['name']);
    }

    public function test_cannot_create_duplicate_role()
    {
        $user = User::factory()->create();
        $user->assignRole('admin');
        Sanctum::actingAs($user);

        $response = $this->postJson('/api/roles', [
            'name' => 'admin' // Already exists
        ]);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['name']);
    }

    public function test_user_with_view_permission_can_show_role()
    {
        $user = User::factory()->create();
        $user->assignRole('user');
        Sanctum::actingAs($user);

        $role = Role::where('name', 'admin')->where('guard_name', 'sanctum')->first();

        $response = $this->getJson("/api/roles/{$role->id}");
        $response->assertStatus(200)
                ->assertJsonStructure([
                    'id', 'name', 'guard_name', 'created_at', 'updated_at', 'permissions'
                ]);
    }

    public function test_user_with_edit_permission_can_update_role()
    {
        $user = User::factory()->create();
        $user->assignRole('admin');
        Sanctum::actingAs($user);

        $role = Role::create(['name' => 'test-role', 'guard_name' => 'sanctum']);

        $updateData = [
            'name' => 'updated-role',
            'permissions' => ['view roles', 'create roles']
        ];

        $response = $this->putJson("/api/roles/{$role->id}", $updateData);
        $response->assertStatus(200)
                ->assertJson([
                    'name' => 'updated-role'
                ]);

        $this->assertDatabaseHas('roles', [
            'id' => $role->id,
            'name' => 'updated-role'
        ]);
    }

    public function test_user_without_edit_permission_cannot_update_role()
    {
        $user = User::factory()->create();
        $user->assignRole('user');
        Sanctum::actingAs($user);

        $role = Role::create(['name' => 'test-role', 'guard_name' => 'sanctum']);

        $response = $this->putJson("/api/roles/{$role->id}", [
            'name' => 'updated-role'
        ]);
        $response->assertStatus(403);
    }

    public function test_cannot_update_core_roles()
    {
        $user = User::factory()->create();
        $user->assignRole('superadmin');
        Sanctum::actingAs($user);

        $superadminRole = Role::where('name', 'superadmin')->where('guard_name', 'sanctum')->first();

        $response = $this->putJson("/api/roles/{$superadminRole->id}", [
            'name' => 'updated-superadmin'
        ]);
        $response->assertStatus(403)
                ->assertJson([
                    'message' => 'Cannot modify core system roles'
                ]);
    }

    public function test_user_with_delete_permission_can_delete_role()
    {
        $user = User::factory()->create();
        $user->assignRole('superadmin');
        Sanctum::actingAs($user);

        $role = Role::create(['name' => 'test-role', 'guard_name' => 'sanctum']);

        $response = $this->deleteJson("/api/roles/{$role->id}");
        $response->assertStatus(204);

        $this->assertDatabaseMissing('roles', [
            'id' => $role->id
        ]);
    }

    public function test_user_without_delete_permission_cannot_delete_role()
    {
        $user = User::factory()->create();
        $user->assignRole('admin');
        Sanctum::actingAs($user);

        $role = Role::create(['name' => 'test-role', 'guard_name' => 'sanctum']);

        $response = $this->deleteJson("/api/roles/{$role->id}");
        $response->assertStatus(403);
    }

    public function test_cannot_delete_core_roles()
    {
        $user = User::factory()->create();
        $user->assignRole('superadmin');
        Sanctum::actingAs($user);

        $superadminRole = Role::where('name', 'superadmin')->where('guard_name', 'sanctum')->first();

        $response = $this->deleteJson("/api/roles/{$superadminRole->id}");
        $response->assertStatus(403)
                ->assertJson([
                    'message' => 'Cannot delete core system roles.'
                ]);
    }

    public function test_role_can_be_created_with_permissions()
    {
        $user = User::factory()->create();
        $user->assignRole('admin');
        Sanctum::actingAs($user);

        $roleData = [
            'name' => 'test-role',
            'permissions' => ['view roles', 'create roles']
        ];

        $response = $this->postJson('/api/roles', $roleData);
        $response->assertStatus(201);

        $createdRole = Role::where('name', 'test-role')->where('guard_name', 'sanctum')->first();
        $this->assertTrue($createdRole->hasPermissionTo('view roles'));
        $this->assertTrue($createdRole->hasPermissionTo('create roles'));
    }

    public function test_role_permissions_can_be_updated()
    {
        $user = User::factory()->create();
        $user->assignRole('admin');
        Sanctum::actingAs($user);

        $role = Role::create(['name' => 'test-role', 'guard_name' => 'sanctum']);
        $role->givePermissionTo('view roles');

        $response = $this->putJson("/api/roles/{$role->id}", [
            'permissions' => ['create roles', 'edit roles']
        ]);

        $response->assertStatus(200);
        $role->refresh();
        $this->assertTrue($role->hasPermissionTo('create roles'));
        $this->assertTrue($role->hasPermissionTo('edit roles'));
        $this->assertFalse($role->hasPermissionTo('view roles'));
    }

    public function test_assign_role_to_user_endpoint()
    {
        $authUser = User::factory()->create();
        $authUser->assignRole('admin');
        Sanctum::actingAs($authUser);

        $targetUser = User::factory()->create();
        $role = Role::where('name', 'user')->where('guard_name', 'sanctum')->first();

        $response = $this->postJson("/api/roles/{$role->id}/assign", [
            'user_id' => $targetUser->id
        ]);

        $response->assertStatus(200)
                ->assertJson([
                    'message' => 'Role assigned successfully'
                ]);

        $this->assertTrue($targetUser->hasRole('user'));
    }

    public function test_revoke_role_from_user_endpoint()
    {
        $authUser = User::factory()->create();
        $authUser->assignRole('admin');
        Sanctum::actingAs($authUser);

        $targetUser = User::factory()->create();
        $targetUser->assignRole('user');
        $role = Role::where('name', 'user')->where('guard_name', 'sanctum')->first();

        $response = $this->postJson("/api/roles/{$role->id}/revoke", [
            'user_id' => $targetUser->id
        ]);

        $response->assertStatus(200)
                ->assertJson([
                    'message' => 'Role revoked successfully'
                ]);

        $this->assertFalse($targetUser->hasRole('user'));
    }

    public function test_pagination_works_correctly()
    {
        $user = User::factory()->create();
        $user->assignRole('user');
        Sanctum::actingAs($user);

        // Create multiple roles
        for ($i = 1; $i <= 15; $i++) {
            Role::create(['name' => "test-role-{$i}", 'guard_name' => 'sanctum']);
        }

        $response = $this->getJson('/api/roles?per_page=10');
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
