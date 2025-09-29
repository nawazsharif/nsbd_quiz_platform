<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PermissionControllerUnauthenticatedTest extends TestCase
{
    use RefreshDatabase;

    public function test_unauthenticated_user_cannot_access_permissions()
    {
        $response = $this->getJson('/api/permissions');
        $response->assertStatus(401);
    }

    public function test_unauthenticated_user_cannot_create_permission()
    {
        $response = $this->postJson('/api/permissions', [
            'name' => 'test permission'
        ]);
        $response->assertStatus(401);
    }

    public function test_unauthenticated_user_cannot_update_permission()
    {
        $response = $this->putJson('/api/permissions/1', [
            'name' => 'updated permission'
        ]);
        $response->assertStatus(401);
    }

    public function test_unauthenticated_user_cannot_delete_permission()
    {
        $response = $this->deleteJson('/api/permissions/1');
        $response->assertStatus(401);
    }
}