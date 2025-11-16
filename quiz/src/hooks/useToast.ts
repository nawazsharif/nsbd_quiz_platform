import toast from 'react-hot-toast'

/**
 * Custom hook for displaying toast notifications
 * Provides consistent toast messaging across the application
 */
export const useToast = () => {
  return {
    success: (message: string) => {
      toast.success(message, {
        duration: 3000,
      })
    },
    error: (message: string) => {
      toast.error(message, {
        duration: 5000,
      })
    },
    loading: (message: string) => {
      return toast.loading(message)
    },
    promise: <T,>(
      promise: Promise<T>,
      messages: {
        loading: string
        success: string | ((data: T) => string)
        error: string | ((error: any) => string)
      }
    ) => {
      return toast.promise(promise, messages)
    },
    dismiss: (toastId?: string) => {
      toast.dismiss(toastId)
    },
    info: (message: string) => {
      toast(message, {
        duration: 4000,
        icon: 'ℹ️',
      })
    },
    warning: (message: string) => {
      toast(message, {
        duration: 4000,
        icon: '⚠️',
        style: {
          border: '2px solid #f59e0b',
          background: '#fffbeb',
        },
      })
    },
  }
}

// Export the raw toast for advanced usage
export { toast }
