<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Define permissions for different modules
        $permissions = [
            // User Management Permissions
            'view users',
            'create users',
            'edit users',
            'delete users',
            
            // Role Management Permissions
            'view roles',
            'create roles',
            'edit roles',
            'delete roles',
            'assign roles',
            'revoke roles',
            
            // Permission Management Permissions
            'view permissions',
            'create permissions',
            'edit permissions',
            'delete permissions',
            'assign permissions',
            'revoke permissions',
            
            // Quiz Management Permissions (for future use)
            'view quizzes',
            'create quizzes',
            'edit quizzes',
            'delete quizzes',
            'publish quizzes',
            
            // Question Management Permissions
            'view questions',
            'create questions',
            'edit questions',
            'delete questions',
            
            // Result Management Permissions
            'view results',
            'edit results',
            'delete results',
            'export results',
            
            // Content Management
            'category_create',
            
            // System Administration Permissions
            'view system settings',
            'edit system settings',
            'view logs',
            'backup system',
            'restore system',
        ];

        // Create permissions for both web and sanctum guards
        foreach ($permissions as $permission) {
            // Create for web guard
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'web'
            ]);
            
            // Create for sanctum guard (API)
            Permission::firstOrCreate([
                'name' => $permission,
                'guard_name' => 'sanctum'
            ]);
        }

        // Assign permissions to existing roles
        $this->assignPermissionsToRoles();

        $this->command->info('Permissions seeded successfully!');
    }

    /**
     * Assign permissions to existing roles
     */
    private function assignPermissionsToRoles(): void
    {
        // Super Admin gets all permissions
        $superAdminWeb = Role::where('name', 'superadmin')->where('guard_name', 'web')->first();
        $superAdminSanctum = Role::where('name', 'superadmin')->where('guard_name', 'sanctum')->first();
        
        if ($superAdminWeb) {
            $superAdminWeb->givePermissionTo(Permission::where('guard_name', 'web')->get());
        }
        
        if ($superAdminSanctum) {
            $superAdminSanctum->givePermissionTo(Permission::where('guard_name', 'sanctum')->get());
        }

        // Admin gets most permissions except system administration
        $adminPermissions = [
            'view users', 'create users', 'edit users', 'delete users',
            'view roles', 'create roles', 'edit roles', 'delete roles', 'assign roles', 'revoke roles',
            'view permissions', 'assign permissions', 'revoke permissions',
            'view quizzes', 'create quizzes', 'edit quizzes', 'delete quizzes', 'publish quizzes',
            'view questions', 'create questions', 'edit questions', 'delete questions',
            'view results', 'edit results', 'delete results', 'export results',
            'category_create',
        ];

        $adminWeb = Role::where('name', 'admin')->where('guard_name', 'web')->first();
        $adminSanctum = Role::where('name', 'admin')->where('guard_name', 'sanctum')->first();
        
        if ($adminWeb) {
            $adminWeb->givePermissionTo(
                Permission::whereIn('name', $adminPermissions)
                    ->where('guard_name', 'web')
                    ->get()
            );
        }
        
        if ($adminSanctum) {
            $adminSanctum->givePermissionTo(
                Permission::whereIn('name', $adminPermissions)
                    ->where('guard_name', 'sanctum')
                    ->get()
            );
        }

        // Regular user gets basic permissions
        $userPermissions = [
            'view quizzes',
            'view questions',
            'view results',
        ];

        $userWeb = Role::where('name', 'user')->where('guard_name', 'web')->first();
        $userSanctum = Role::where('name', 'user')->where('guard_name', 'sanctum')->first();
        
        if ($userWeb) {
            $userWeb->givePermissionTo(
                Permission::whereIn('name', $userPermissions)
                    ->where('guard_name', 'web')
                    ->get()
            );
        }
        
        if ($userSanctum) {
            $userSanctum->givePermissionTo(
                Permission::whereIn('name', $userPermissions)
                    ->where('guard_name', 'sanctum')
                    ->get()
            );
        }

        $this->command->info('Permissions assigned to roles successfully!');
    }
}
