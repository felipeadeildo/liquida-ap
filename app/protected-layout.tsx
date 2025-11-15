import { useEffect } from 'react'
import { Outlet, useNavigate } from 'react-router'
import { Spinner } from '~/components/ui/spinner'
import { useAuth } from '~/lib/auth'

export default function ProtectedLayout() {
  const { user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login', { replace: true })
    }
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Spinner className="size-8 mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <Outlet />
}
