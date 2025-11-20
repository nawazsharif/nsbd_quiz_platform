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
     *   summary="Upload an image, PDF, or video file",
     *   security={{"sanctum":{}}},
     *   @OA\RequestBody(
     *     required=true,
     *     @OA\MediaType(mediaType="multipart/form-data",
     *       @OA\Schema(
     *         @OA\Property(property="file", type="string", format="binary", description="Image, PDF, or video file to upload (max 50MB)"),
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
            'file' => 'required|file|mimes:jpeg,png,webp,gif,pdf,mp4,mov,avi,wmv,flv,mkv,webm|max:51200', // max 50MB (images, PDFs, videos)
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
