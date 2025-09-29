<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

/**
 * @OA\Tag(name="Uploads", description="Media upload endpoints")
 */
class UploadController extends Controller
{
    public function __construct()
    {
        $this->middleware('auth:sanctum');
    }

    /**
     * @OA\Post(
     *   path="/api/uploads",
     *   tags={"Uploads"},
     *   summary="Upload an image",
     *   security={{"sanctum":{}}},
     *   @OA\RequestBody(
     *     required=true,
     *     @OA\MediaType(mediaType="multipart/form-data",
     *       @OA\Schema(
     *         @OA\Property(property="file", type="string", format="binary", description="Image file to upload"),
     *       )
     *     )
     *   ),
     *   @OA\Response(response=200, description="OK",
     *     @OA\JsonContent(type="object",
     *       @OA\Property(property="url", type="string"),
     *       @OA\Property(property="path", type="string"),
     *       @OA\Property(property="mime", type="string"),
     *       @OA\Property(property="size", type="integer")
     *     )
     *   ),
     *   @OA\Response(response=422, description="Validation error")
     * )
     */
    public function store(Request $request)
    {
        $request->validate([
            'file' => 'required|file|image|mimes:jpeg,png,webp,gif|max:5120', // max 5MB
        ]);

        $file = $request->file('file');
        $path = $file->store('uploads', 'public');

        $url = Storage::disk('public')->url($path);

        return response()->json([
            'url' => $url,
            'path' => $path,
            'mime' => $file->getMimeType(),
            'size' => $file->getSize(),
        ]);
    }
}

