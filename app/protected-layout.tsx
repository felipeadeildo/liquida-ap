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
      <div className="h-screen flex items-center justify-center flex-col gap-3 bg-background">
        <Spinner className="size-8 mx-auto relative" />
        <p className="text-muted-foreground text-sm font-medium">
          Carregando...
        </p>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return <Outlet />
}
