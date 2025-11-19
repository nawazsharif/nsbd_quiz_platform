'use client'

import React, { useEffect, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Placeholder from '@tiptap/extension-placeholder'
import Link from '@tiptap/extension-link'

type Props = {
  value: string
  onChange: (html: string) => void
  placeholder?: string
  token?: string
}

export default function TiptapEditor({ value, onChange, placeholder, token }: Props) {
  const [imageExt, setImageExt] = useState<any | null>(null)
  const canUseImage = Boolean(process.env.NEXT_PUBLIC_TIPTAP_IMAGE_PKG)

  // Dynamically load image extension only when explicitly enabled via env
  useEffect(() => {
    if (!canUseImage) return
    let mounted = true
    const modulePath = String(process.env.NEXT_PUBLIC_TIPTAP_IMAGE_PKG)
    // Avoid static analysis by using Function-based dynamic import
    // eslint-disable-next-line no-new-func
    const dynImport = new Function('p', 'return import(p)') as (p: string) => Promise<any>
    dynImport(modulePath)
      .then((mod) => { if (mounted) setImageExt(mod.default || mod) })
      .catch(() => { if (mounted) setImageExt(null) })
    return () => { mounted = false }
  }, [canUseImage])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [2, 3, 4] } }),
      Underline,
      Link.configure({ openOnClick: false, autolink: true, linkOnPaste: true }),
      ...(imageExt ? [imageExt] : []),
      Placeholder.configure({ placeholder: placeholder || 'Write something…' }),
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'max-w-none min-h-[160px] focus:outline-none ProseMirror p-3 rounded-md border border-slate-300 bg-white text-slate-900 prose prose-slate',
        'data-testid': 'tiptap-editor'
      }
    },
    onUpdate: ({ editor }) => {
      try {
        onChange(editor.getHTML())
      } catch (error) {
        console.error('TiptapEditor onChange error:', error)
      }
    },
    immediatelyRender: false,
  }, [imageExt])

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if ((value || '') !== current) {
      try {
        editor.commands.setContent(value || '')
      } catch (error) {
        console.error('TiptapEditor setContent error:', error)
      }
    }
  }, [value, editor])

  if (!editor) return <div className="min-h-[160px] p-3 rounded-md border bg-gray-50 animate-pulse" />

  const fileInputId = 'tiptap-image-input'

  const triggerImageUpload = () => {
    const input = document.getElementById(fileInputId) as HTMLInputElement | null
    input?.click()
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const fd = new FormData()
      fd.append('file', file)
      const uploadUrl = process.env.NEXT_PUBLIC_IMAGE_UPLOAD_URL || '/backend/uploads'
      const res = await fetch(uploadUrl, { method: 'POST', headers: token ? { 'Authorization': `Bearer ${token}` } : undefined, body: fd })
      const data = await res.json()
      if (!res.ok) throw new Error(data?.message || 'Upload failed')
      const url = data.url as string
      // Only try to set image if the extension is available
      if (imageExt && (editor as any)?.commands?.setImage) {
        (editor as any)?.chain().focus().setImage({ src: url }).run()
      }
    } catch (err) {
      console.error('Image upload failed', err)
    } finally {
      e.currentTarget.value = ''
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive('bold')}>B</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive('italic')}>I</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive('underline')}>U</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive('bulletList')}>• List</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setParagraph().run()} active={editor.isActive('paragraph')}>P</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive('heading', { level: 2 })}>H2</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive('heading', { level: 3 })}>H3</ToolbarButton>
        <ToolbarButton onClick={() => {
          const url = window.prompt('Enter URL')?.trim()
          if (!url) return
          editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
        }} active={editor.isActive('link')}>Link</ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().unsetLink().run()}>Unlink</ToolbarButton>
        {imageExt && (
          <>
            <ToolbarButton onClick={triggerImageUpload}>Image</ToolbarButton>
            <ToolbarButton onClick={() => {
          const url = window.prompt('Image URL')?.trim()
          if (!url) return
          // Only try to set image if the extension is available
          if (imageExt && (editor as any)?.commands?.setImage) {
            (editor as any)?.chain().focus().setImage({ src: url }).run()
          }
        }}>Image URL</ToolbarButton>
          </>
        )}
      </div>
      <input id={fileInputId} type="file" accept="image/*" className="hidden" onChange={onFileChange} />
      <EditorContent editor={editor} />
    </div>
  )
}

function ToolbarButton({ onClick, active, children }: { onClick: () => void, active?: boolean, children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-8 px-2 rounded-md border text-sm font-medium transition-colors ${active ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50'}`}
    >
      {children}
    </button>
  )
}
