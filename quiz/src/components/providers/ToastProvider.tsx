'use client'

import { Toaster } from 'react-hot-toast'

export default function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={8}
      toastOptions={{
        // Default options
        duration: 4000,
        style: {
          background: '#fff',
          color: '#1e293b',
          padding: '16px',
          borderRadius: '12px',
          border: '2px solid #e2e8f0',
          boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
          fontSize: '14px',
          fontWeight: '500',
        },
        // Success toast style
        success: {
          duration: 3000,
          style: {
            border: '2px solid #10b981',
            background: '#f0fdf4',
          },
          iconTheme: {
            primary: '#10b981',
            secondary: '#f0fdf4',
          },
        },
        // Error toast style
        error: {
          duration: 5000,
          style: {
            border: '2px solid #ef4444',
            background: '#fef2f2',
          },
          iconTheme: {
            primary: '#ef4444',
            secondary: '#fef2f2',
          },
        },
        // Loading toast style
        loading: {
          style: {
            border: '2px solid #3b82f6',
            background: '#eff6ff',
          },
          iconTheme: {
            primary: '#3b82f6',
            secondary: '#eff6ff',
          },
        },
      }}
    />
  )
}
