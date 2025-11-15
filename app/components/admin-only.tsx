import type { ReactNode } from 'react'
import { useAuth } from '~/lib/auth'

interface AdminOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Component that only renders its children if the current user is an admin
 *
 * @example
 * <AdminOnly>
 *   <button>Admin Feature</button>
 * </AdminOnly>
 *
 * @example
 * <AdminOnly fallback={<p>Access Denied</p>}>
 *   <AdminDashboard />
 * </AdminOnly>
 */
export function AdminOnly({ children, fallback = null }: AdminOnlyProps) {
  const { isAdmin, loading } = useAuth()

  if (loading) {
    return null
  }

  if (!isAdmin) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
