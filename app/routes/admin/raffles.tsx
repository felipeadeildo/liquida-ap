import {
  ArrowLeft,
  CheckCircle2,
  Dices,
  Gift,
  Loader2,
  Sparkles,
  Users,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import confetti from 'canvas-confetti'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Spinner } from '~/components/ui/spinner'
import { useAuth } from '~/lib/auth'
import { formatDate } from '~/lib/format'
import { supabase } from '~/lib/supabase'
import type { Tables } from '~/types/database'
import type { Route } from './+types/raffles'

type DonationItem = Tables<'items_with_status'> & {
  participant_count: number
  claims: Array<Tables<'donation_claims'> & { users_public: { name: string | null } | null }>
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Sorteios - Admin' },
    { name: 'description', content: 'Gerencie sorteios de itens de doação' },
  ]
}

export default function AdminRaffles() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<DonationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [raffling, setRaffling] = useState<string | null>(null)

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/')
    }
  }, [authLoading, user, isAdmin, navigate])

  // Fetch donation items
  useEffect(() => {
    if (!user || !isAdmin) return

    fetchDonationItems()

    // Real-time updates
    const channel = supabase
      .channel('admin-raffles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'donation_claims',
        },
        () => fetchDonationItems()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, isAdmin])

  const fetchDonationItems = async () => {
    try {
      setLoading(true)

      // Get all finished donation items
      const { data: itemsData, error: itemsError } = await supabase
        .from('items_with_status')
        .select('*')
        .eq('is_donation', true)
        .eq('computed_status', 'finished')
        .order('auction_end', { ascending: false })

      if (itemsError) throw itemsError

      // For each item, get claims with user names
      const itemsWithClaims = await Promise.all(
        (itemsData || []).map(async (item) => {
          const { data: claims, error: claimsError } = await supabase
            .from('donation_claims')
            .select('*, users_public(name)')
            .eq('item_id', item.id!)
            .order('created_at', { ascending: true })

          if (claimsError) throw claimsError

          const pendingCount = claims?.filter((c) => c.status === 'pending').length || 0

          return {
            ...item,
            participant_count: pendingCount,
            claims: claims || [],
          }
        })
      )

      setItems(itemsWithClaims)
    } catch (err) {
      console.error('Error fetching donation items:', err)
      toast.error('Erro ao carregar itens de doação')
    } finally {
      setLoading(false)
    }
  }

  const handleRaffle = async (item: DonationItem) => {
    const pendingClaims = item.claims.filter((c) => c.status === 'pending')

    if (pendingClaims.length === 0) {
      toast.error('Não há participantes pendentes para sortear')
      return
    }

    setRaffling(item.id!)

    try {
      // Simulate raffle animation delay
      await new Promise((resolve) => setTimeout(resolve, 2000))

      // Random selection
      const winnerIndex = Math.floor(Math.random() * pendingClaims.length)
      const winner = pendingClaims[winnerIndex]

      // Update winner to approved
      const { error: approveError } = await supabase
        .from('donation_claims')
        .update({ status: 'approved' })
        .eq('id', winner.id)

      if (approveError) throw approveError

      // Reject all others
      const otherClaimIds = pendingClaims
        .filter((c) => c.id !== winner.id)
        .map((c) => c.id)

      if (otherClaimIds.length > 0) {
        const { error: rejectError } = await supabase
          .from('donation_claims')
          .update({ status: 'rejected' })
          .in('id', otherClaimIds)

        if (rejectError) throw rejectError
      }

      // Confetti celebration
      confetti({
        particleCount: 200,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#f97316', '#a78bfa'],
      })

      toast.success(
        `🎉 ${winner.users_public?.name || 'Participante'} foi sorteado!`
      )

      // Refresh list
      await fetchDonationItems()
    } catch (err) {
      console.error('Error raffling:', err)
      toast.error('Erro ao realizar sorteio')
    } finally {
      setRaffling(null)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (!user || !isAdmin) return null

  const pendingItems = items.filter((i) => i.participant_count > 0)
  const completedItems = items.filter(
    (i) => i.participant_count === 0 && i.claims.some((c) => c.status === 'approved')
  )

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="border-b bg-background sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
              <ArrowLeft className="size-4 mr-2" />
              Voltar
            </Button>
            <div className="h-6 w-px bg-border hidden sm:block" />
            <div className="flex items-center gap-2">
              <Gift className="size-5 text-primary" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold">
                  Sorteios de Doações
                </h1>
                <p className="text-xs text-muted-foreground">
                  Área Administrativa
                </p>
              </div>
            </div>
          </div>
          <Badge variant="default">Admin</Badge>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6">
        <div className="container mx-auto max-w-7xl space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            <Card className="p-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total de Doações</p>
                <p className="text-2xl md:text-3xl font-bold">{items.length}</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-2xl md:text-3xl font-bold text-destructive">
                  {pendingItems.length}
                </p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Concluídos</p>
                <p className="text-2xl md:text-3xl font-bold text-green-600">
                  {completedItems.length}
                </p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Participantes</p>
                <p className="text-2xl md:text-3xl font-bold text-blue-600">
                  {items.reduce((sum, i) => sum + i.claims.length, 0)}
                </p>
              </div>
            </Card>
          </div>

          {/* Pending Raffles */}
          {pendingItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Dices className="size-5 text-destructive" />
                <h2 className="text-xl md:text-2xl font-bold">
                  Aguardando Sorteio
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingItems.map((item) => (
                  <RaffleCard
                    key={item.id}
                    item={item}
                    onRaffle={handleRaffle}
                    isRaffling={raffling === item.id}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Completed Raffles */}
          {completedItems.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-5 text-green-600" />
                <h2 className="text-xl md:text-2xl font-bold">
                  Sorteios Concluídos
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedItems.map((item) => (
                  <CompletedRaffleCard key={item.id} item={item} />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {items.length === 0 && (
            <div className="text-center py-12 space-y-4">
              <div className="bg-muted rounded-full p-6 inline-block">
                <Gift className="size-12 text-muted-foreground" />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl md:text-2xl font-bold">
                  Nenhuma doação finalizada
                </h3>
                <p className="text-sm text-muted-foreground">
                  Aguarde os leilões de doação terminarem para realizar sorteios
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

function RaffleCard({
  item,
  onRaffle,
  isRaffling,
}: {
  item: DonationItem
  onRaffle: (item: DonationItem) => void
  isRaffling: boolean
}) {
  const pendingClaims = item.claims.filter((c) => c.status === 'pending')

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-start gap-3">
        {item.photos && item.photos.length > 0 && (
          <img
            src={item.photos[0]}
            alt={item.title || ''}
            className="size-16 rounded object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm line-clamp-2">
            {item.title || 'Sem título'}
          </h3>
          <p className="text-xs text-muted-foreground">
            Encerrado em {formatDate(item.auction_end)}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between py-2 border-y">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Participantes</span>
        </div>
        <span className="text-lg font-bold text-primary">
          {item.participant_count}
        </span>
      </div>

      <div className="space-y-2">
        <p className="text-xs text-muted-foreground">Participantes:</p>
        <div className="flex flex-wrap gap-1">
          {pendingClaims.map((claim) => (
            <Badge key={claim.id} variant="secondary" className="text-xs">
              {claim.users_public?.name || 'Sem nome'}
            </Badge>
          ))}
        </div>
      </div>

      <Button
        onClick={() => onRaffle(item)}
        disabled={isRaffling || item.participant_count === 0}
        className="w-full gap-2"
      >
        {isRaffling ? (
          <>
            <Loader2 className="size-4 animate-spin" />
            Sorteando...
          </>
        ) : (
          <>
            <Dices className="size-4" />
            Realizar Sorteio
          </>
        )}
      </Button>
    </Card>
  )
}

function CompletedRaffleCard({ item }: { item: DonationItem }) {
  const winner = item.claims.find((c) => c.status === 'approved')
  const totalParticipants = item.claims.length

  return (
    <Card className="p-4 space-y-3 border-green-600/20 bg-green-600/5">
      <div className="flex items-start gap-3">
        {item.photos && item.photos.length > 0 && (
          <img
            src={item.photos[0]}
            alt={item.title || ''}
            className="size-16 rounded object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-sm line-clamp-2">
            {item.title || 'Sem título'}
          </h3>
          <p className="text-xs text-muted-foreground">
            Sorteado em {formatDate(item.auction_end)}
          </p>
        </div>
        <CheckCircle2 className="size-5 text-green-600 shrink-0" />
      </div>

      <div className="space-y-2 py-2 border-y">
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Vencedor:</span>
          <Badge variant="default" className="gap-1">
            <Sparkles className="size-3" />
            {winner?.users_public?.name || 'Desconhecido'}
          </Badge>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Participantes:</span>
          <span className="text-sm font-semibold">{totalParticipants}</span>
        </div>
      </div>
    </Card>
  )
}
