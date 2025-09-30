const DEFAULT_PROXY_PATH = '/backend'

export const getApiBaseUrl = () => {
  const directUrl = process.env.NEXT_PUBLIC_API_URL
  const internalUrl = process.env.INTERNAL_API_URL

  // On the server, prefer the internal Docker network URL when provided
  if (typeof window === 'undefined') {
    return internalUrl || directUrl || DEFAULT_PROXY_PATH
  }

  // In the browser, stick to the public URL (relative so it works behind proxies)
  return directUrl || DEFAULT_PROXY_PATH
}

export const buildApiUrl = (path: string) => {
  const base = getApiBaseUrl().replace(/\/$/, '')
  const normalized = path.startsWith('/') ? path : `/${path}`
  return `${base}${normalized}`
}
