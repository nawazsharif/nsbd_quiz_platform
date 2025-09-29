<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Foundation\Testing\WithFaker;
use Laravel\Sanctum\Sanctum;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class PermissionControllerTest extends TestCase
{
    use RefreshDatabase, WithFaker;

    protected User $user;
    protected Role $role;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create a user with permissions
        $this->user = User::factory()->create();
        $this->role = Role::create(['name' => 'admin', 'guard_name' => 'sanctum']);
        
        // Create permissions for testing
        Permission::create(['name' => 'view permissions', 'guard_name' => 'sanctum']);
        Permission::create(['name' => 'create permissions', 'guard_name' => 'sanctum']);
        Permission::create(['name' => 'edit permissions', 'guard_name' => 'sanctum']);
        Permission::create(['name' => 'delete permissions', 'guard_name' => 'sanctum']);
        
        // Assign permissions to role and role to user
        $this->role->givePermissionTo(['view permissions', 'create permissions', 'edit permissions', 'delete permissions']);
        $this->user->assignRole($this->role);
        
        // Authenticate user
        Sanctum::actingAs($this->user);
    }

    public function test_can_list_permissions()
    {
        // Create some test permissions
        Permission::create(['name' => 'test permission 1', 'guard_name' => 'sanctum']);
        Permission::create(['name' => 'test permission 2', 'guard_name' => 'sanctum']);

        $response = $this->getJson('/api/permissions');

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        '*' => [
                            'id',
                            'name',
                            'guard_name',
                            'created_at',
                            'updated_at'
                        ]
                    ]
                ]);
    }

    public function test_can_create_permission()
    {
        $permissionData = [
            'name' => 'test new permission',
            'guard_name' => 'sanctum'
        ];

        $response = $this->postJson('/api/permissions', $permissionData);

        $response->assertStatus(201)
                ->assertJson([
                    'message' => 'Permission created successfully',
                    'data' => [
                        'name' => 'test new permission',
                        'guard_name' => 'sanctum'
                    ]
                ]);

        $this->assertDatabaseHas('permissions', $permissionData);
    }

    public function test_can_create_permission_with_default_guard()
    {
        $permissionData = [
            'name' => 'test permission default guard'
        ];

        $response = $this->postJson('/api/permissions', $permissionData);

        $response->assertStatus(201)
                ->assertJson([
                    'message' => 'Permission created successfully',
                    'data' => [
                        'name' => 'test permission default guard',
                        'guard_name' => 'web'
                    ]
                ]);

        $this->assertDatabaseHas('permissions', [
            'name' => 'test permission default guard',
            'guard_name' => 'web'
        ]);
    }

    public function test_cannot_create_duplicate_permission()
    {
        Permission::create(['name' => 'duplicate permission', 'guard_name' => 'sanctum']);

        $permissionData = [
            'name' => 'duplicate permission',
            'guard_name' => 'sanctum'
        ];

        $response = $this->postJson('/api/permissions', $permissionData);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['name']);
    }

    public function test_can_show_permission()
    {
        $permission = Permission::create(['name' => 'test show permission', 'guard_name' => 'sanctum']);

        $response = $this->getJson("/api/permissions/{$permission->id}");

        $response->assertStatus(200)
                ->assertJson([
                    'data' => [
                        'id' => $permission->id,
                        'name' => 'test show permission',
                        'guard_name' => 'sanctum'
                    ]
                ]);
    }

    public function test_can_update_permission()
    {
        $permission = Permission::create(['name' => 'old permission name', 'guard_name' => 'sanctum']);

        $updateData = [
            'name' => 'updated permission name',
            'guard_name' => 'web'
        ];

        $response = $this->putJson("/api/permissions/{$permission->id}", $updateData);

        $response->assertStatus(200)
                ->assertJson([
                    'message' => 'Permission updated successfully',
                    'data' => [
                        'name' => 'updated permission name',
                        'guard_name' => 'web'
                    ]
                ]);

        $this->assertDatabaseHas('permissions', [
            'id' => $permission->id,
            'name' => 'updated permission name',
            'guard_name' => 'web'
        ]);
    }

    public function test_cannot_update_permission_with_duplicate_name()
    {
        $permission1 = Permission::create(['name' => 'permission 1', 'guard_name' => 'sanctum']);
        $permission2 = Permission::create(['name' => 'permission 2', 'guard_name' => 'sanctum']);

        $updateData = [
            'name' => 'permission 1',
            'guard_name' => 'sanctum'
        ];

        $response = $this->putJson("/api/permissions/{$permission2->id}", $updateData);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['name']);
    }

    public function test_can_delete_permission()
    {
        $permission = Permission::create(['name' => 'permission to delete', 'guard_name' => 'sanctum']);

        $response = $this->deleteJson("/api/permissions/{$permission->id}");

        $response->assertStatus(200)
                ->assertJson([
                    'message' => 'Permission deleted successfully'
                ]);

        $this->assertDatabaseMissing('permissions', [
            'id' => $permission->id
        ]);
    }

    public function test_can_get_roles_for_permission()
    {
        $permission = Permission::create(['name' => 'test permission roles', 'guard_name' => 'sanctum']);
        $role1 = Role::create(['name' => 'role 1', 'guard_name' => 'sanctum']);
        $role2 = Role::create(['name' => 'role 2', 'guard_name' => 'sanctum']);
        
        $role1->givePermissionTo($permission);
        $role2->givePermissionTo($permission);

        $response = $this->getJson("/api/permissions/{$permission->id}/roles");

        $response->assertStatus(200)
                ->assertJsonStructure([
                    'data' => [
                        '*' => [
                            'id',
                            'name',
                            'guard_name'
                        ]
                    ]
                ])
                ->assertJsonCount(2, 'data');
    }

    public function test_returns_404_for_nonexistent_permission()
    {
        $response = $this->getJson('/api/permissions/999');

        $response->assertStatus(404);
    }

    public function test_validation_errors_for_invalid_data()
    {
        $response = $this->postJson('/api/permissions', [
            'name' => '', // Empty name
            'guard_name' => 'invalid_guard' // Invalid guard
        ]);

        $response->assertStatus(422)
                ->assertJsonValidationErrors(['name', 'guard_name']);
    }

    public function test_unauthorized_user_cannot_access_permissions()
    {
        // Create a user without permissions
        $unauthorizedUser = User::factory()->create();
        Sanctum::actingAs($unauthorizedUser);

        $response = $this->getJson('/api/permissions');

        $response->assertStatus(403);
    }
}