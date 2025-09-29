import { NextResponse } from 'next/server'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ message: 'No file' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadsDir, { recursive: true })

    const ext = (file.name?.split('.').pop() || 'png').toLowerCase()
    const safeExt = ext.match(/^[a-z0-9]+$/) ? ext : 'png'
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2,8)}.${safeExt}`
    const filepath = path.join(uploadsDir, filename)

    await writeFile(filepath, buffer)

    const url = `/uploads/${filename}`
    return NextResponse.json({ url })
  } catch (e) {
    console.error('Upload error', e)
    return NextResponse.json({ message: 'Upload failed' }, { status: 500 })
  }
}

