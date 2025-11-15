import { LogOut, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router'
import { AdminOnly } from '~/components/admin-only'
import { CreateItemDialog } from '~/components/admin/create-item-dialog'
import { ItemsList } from '~/components/auction/items-list'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { useAuth } from '~/lib/auth'
import type { Route } from './+types/home'

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Liquida AP' },
    { name: 'description', content: 'Ap 72 ta acabando... que triste!' },
  ]
}

export default function Home() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="size-6 text-primary" />
            <h1 className="text-2xl font-bold">Liquida AP</h1>
          </div>
          <div className="flex items-center gap-2">
            <AdminOnly>
              <CreateItemDialog />
            </AdminOnly>
            <Button variant="ghost" size="sm" onClick={handleSignOut}>
              <LogOut className="size-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 bg-background">
        <div className="container mx-auto max-w-7xl space-y-6">
          {/* Welcome Section */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">
                Olá, {profile?.name?.split(' ')[0] || 'visitante'}!
              </h2>
              <p className="text-sm text-muted-foreground">Leilão do AP 72</p>
            </div>
            <div className="flex gap-2">
              {profile?.is_insper && (
                <>
                  <AdminOnly>
                    <Badge variant="default">Admin</Badge>
                  </AdminOnly>
                  <Badge variant="secondary">Insper</Badge>
                </>
              )}
              <AdminOnly fallback={null}>
                {!profile?.is_insper && <Badge variant="default">Admin</Badge>}
              </AdminOnly>
            </div>
          </div>

          {/* Items Grid */}
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
              <Sparkles className="size-6 text-primary" />
              Itens Disponíveis
            </h2>
            <ItemsList />
          </div>
        </div>
      </main>
    </div>
  )
}
