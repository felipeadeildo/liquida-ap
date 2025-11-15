import { useNavigate } from 'react-router'
import { LogOut, Sparkles } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Card, CardContent } from '~/components/ui/card'
import { Badge } from '~/components/ui/badge'
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
            Sign Out
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-4 bg-background">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6 text-center space-y-6">
            <div className="space-y-2">
              <h2 className="text-4xl font-bold">
                Welcome, {profile?.name || 'there'}! 👋
              </h2>
              {profile?.is_insper && (
                <div className="flex justify-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    Insper Student
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
                Welcome to Liquida AP - the auction platform for AP 72 items.
              </p>
              <div className="bg-muted/50 border rounded-lg p-6 space-y-2">
                <h3 className="text-xl font-semibold flex items-center justify-center gap-2">
                  <Sparkles className="size-5 text-primary" />
                  Coming Soon
                </h3>
                <p className="text-muted-foreground">
                  We're preparing something special! The auction will start soon, so stay tuned for amazing deals on furniture, electronics, and more.
                </p>
              </div>
            </div>

            <div className="pt-4">
              <p className="text-sm text-muted-foreground">
                Ap 72 ta acabando... que triste! 😢 But let's make the best of it!
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
