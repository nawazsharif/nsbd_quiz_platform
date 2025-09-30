export { apiBase as getApiBaseUrl, buildApiUrl } from './env'
export const isApiAvailable = () => Boolean(process.env.NEXT_PUBLIC_API_URL)
