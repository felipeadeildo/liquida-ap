import { LogOut, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
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
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="size-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-4xl font-bold">
                Bem-vindo, {profile?.name || 'visitante'}! 👋
              </h2>
              {profile?.is_insper && (
                <div className="flex justify-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    Estudante Insper
                  </Badge>
                  {profile.course && (
                    <Badge variant="outline" className="text-sm">
                      {profile.course}
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <p className="text-muted-foreground text-lg">
                Bem-vindo ao Liquida AP - a plataforma de leilão para os itens
                do AP 72.
              </p>
              <div className="bg-muted/50 border rounded-lg p-6 space-y-2">
                <h3 className="text-xl font-semibold flex items-center justify-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  Em Breve
                </h3>
                <p className="text-muted-foreground">
                  Estamos preparando algo especial! O leilão começará em breve,
                  então fique ligado para ofertas incríveis em móveis,
                  eletrônicos e muito mais.
                </p>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-sm text-muted-foreground">
                Ap 72 ta acabando... que triste! 😢 Mas vamos aproveitar ao
                máximo!
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
