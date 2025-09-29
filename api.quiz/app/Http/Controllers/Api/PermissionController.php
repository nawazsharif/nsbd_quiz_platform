<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\StorePermissionRequest;
use App\Http\Requests\UpdatePermissionRequest;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;
use Spatie\Permission\Models\Permission;

/**
 * @OA\Tag(
 *     name="Permissions",
 *     description="Permission management endpoints"
 * )
 */
class PermissionController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
        $this->middleware('permission:view permissions')->only(['index', 'show']);
        $this->middleware('permission:create permissions')->only(['store']);
        $this->middleware('permission:edit permissions')->only(['update']);
        $this->middleware('permission:delete permissions')->only(['destroy']);
    }

    /**
     * @OA\Get(
     *     path="/api/permissions",
     *     summary="Get all permissions",
     *     tags={"Permissions"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(
     *         name="per_page",
     *         in="query",
     *         description="Number of permissions per page",
     *         required=false,
     *         @OA\Schema(type="integer", default=15)
     *     ),
     *     @OA\Parameter(
     *         name="search",
     *         in="query",
     *         description="Search permissions by name",
     *         required=false,
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Parameter(
     *         name="guard_name",
     *         in="query",
     *         description="Filter by guard name",
     *         required=false,
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             @OA\Property(property="data", type="array", @OA\Items(ref="#/components/schemas/Permission")),
     *             @OA\Property(property="current_page", type="integer"),
     *             @OA\Property(property="last_page", type="integer"),
     *             @OA\Property(property="per_page", type="integer"),
     *             @OA\Property(property="total", type="integer")
     *         )
     *     ),
     *     @OA\Response(response=403, description="Forbidden")
     * )
     */
    public function index(Request $request)
    {
        $query = Permission::query();

        // Search by name
        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        // Filter by guard
        if ($request->filled('guard_name')) {
            $query->where('guard_name', $request->guard_name);
        }

        // Order by name
        $query->orderBy('name');

        $permissions = $query->paginate($request->get('per_page', 15));

        return response()->json($permissions);
    }

    /**
     * @OA\Post(
     *     path="/api/permissions",
     *     summary="Create a new permission",
     *     tags={"Permissions"},
     *     security={{"sanctum":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"name"},
     *             @OA\Property(property="name", type="string", example="create posts"),
     *             @OA\Property(property="guard_name", type="string", example="sanctum", description="Defaults to sanctum if not provided")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Permission created successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Permission created successfully"),
     *             @OA\Property(property="permission", ref="#/components/schemas/Permission")
     *         )
     *     ),
     *     @OA\Response(response=422, description="Validation error"),
     *     @OA\Response(response=403, description="Forbidden")
     * )
     */
    public function store(StorePermissionRequest $request)
    {
        $validated = $request->validated();
        
        $permission = Permission::create([
            'name' => $validated['name'],
            'guard_name' => $validated['guard_name'] ?? 'web'
        ]);

        return response()->json([
            'message' => 'Permission created successfully',
            'data' => $permission
        ], 201);
    }

    /**
     * @OA\Get(
     *     path="/api/permissions/{id}",
     *     summary="Get a specific permission",
     *     tags={"Permissions"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         description="Permission ID",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(ref="#/components/schemas/Permission")
     *     ),
     *     @OA\Response(response=404, description="Permission not found"),
     *     @OA\Response(response=403, description="Forbidden")
     * )
     */
    public function show(Permission $permission)
    {
        return response()->json([
            'data' => $permission
        ]);
    }

    /**
     * @OA\Put(
     *     path="/api/permissions/{id}",
     *     summary="Update a permission",
     *     tags={"Permissions"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         description="Permission ID",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"name"},
     *             @OA\Property(property="name", type="string", example="edit posts"),
     *             @OA\Property(property="guard_name", type="string", example="sanctum")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Permission updated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Permission updated successfully"),
     *             @OA\Property(property="permission", ref="#/components/schemas/Permission")
     *         )
     *     ),
     *     @OA\Response(response=422, description="Validation error"),
     *     @OA\Response(response=404, description="Permission not found"),
     *     @OA\Response(response=403, description="Forbidden")
     * )
     */
    public function update(UpdatePermissionRequest $request, Permission $permission)
    {
        $validated = $request->validated();
        
        $permission->update([
            'name' => $validated['name'],
            'guard_name' => $validated['guard_name'] ?? $permission->guard_name
        ]);

        return response()->json([
            'message' => 'Permission updated successfully',
            'data' => $permission->fresh()
        ]);
    }

    /**
     * @OA\Delete(
     *     path="/api/permissions/{id}",
     *     summary="Delete a permission",
     *     tags={"Permissions"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         description="Permission ID",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Permission deleted successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Permission deleted successfully")
     *         )
     *     ),
     *     @OA\Response(response=404, description="Permission not found"),
     *     @OA\Response(response=403, description="Forbidden"),
     *     @OA\Response(
     *         response=409,
     *         description="Cannot delete permission that is assigned to roles",
     *         @OA\JsonContent(
     *             @OA\Property(property="message", type="string", example="Cannot delete permission that is assigned to roles"),
     *             @OA\Property(property="roles", type="array", @OA\Items(type="string"))
     *         )
     *     )
     * )
     */
    public function destroy(Permission $permission)
    {
        // Check if permission is assigned to any roles
        $rolesWithPermission = $permission->roles()->pluck('name')->toArray();
        
        if (!empty($rolesWithPermission)) {
            return response()->json([
                'message' => 'Cannot delete permission that is assigned to roles',
                'roles' => $rolesWithPermission
            ], Response::HTTP_CONFLICT);
        }

        $permission->delete();

        return response()->json([
            'message' => 'Permission deleted successfully'
        ]);
    }

    /**
     * @OA\Get(
     *     path="/api/permissions/{id}/roles",
     *     summary="Get roles that have this permission",
     *     tags={"Permissions"},
     *     security={{"sanctum":{}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         description="Permission ID",
     *         required=true,
     *         @OA\Schema(type="integer")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Successful operation",
     *         @OA\JsonContent(
     *             @OA\Property(property="roles", type="array", @OA\Items(ref="#/components/schemas/Role"))
     *         )
     *     ),
     *     @OA\Response(response=404, description="Permission not found"),
     *     @OA\Response(response=403, description="Forbidden")
     * )
     */
    public function roles(Permission $permission)
    {
        return response()->json([
            'data' => $permission->roles
        ]);
    }
}