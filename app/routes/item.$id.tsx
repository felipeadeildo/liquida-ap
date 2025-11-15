import { ArrowLeft, Clock, Heart, TrendingUp } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '~/components/ui/carousel'
import { Input } from '~/components/ui/input'
import { Spinner } from '~/components/ui/spinner'
import { useAuth } from '~/lib/auth'
import { supabase } from '~/lib/supabase'
import type { Tables } from '~/types/database'
import type { Route } from './+types/item.$id'

type ItemWithStatus = Tables<'items_with_status'>
type Bid = Tables<'bids'> & {
  users: {
    name: string
  } | null
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatTimeRemaining(seconds: number | null): string {
  if (!seconds || seconds <= 0) return 'Encerrado'

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

function formatRelativeTime(date: string): string {
  const now = new Date()
  const then = new Date(date)
  const diffMs = now.getTime() - then.getTime()
  const diffMins = Math.floor(diffMs / 60000)

  if (diffMins < 1) return 'agora mesmo'
  if (diffMins < 60) return `há ${diffMins}min`
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `há ${diffHours}h`
  const diffDays = Math.floor(diffHours / 24)
  return `há ${diffDays}d`
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Item - Liquida AP' },
    { name: 'description', content: 'Detalhes do item em leilão' },
  ]
}

export default function ItemDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, profile } = useAuth()

  const [item, setItem] = useState<ItemWithStatus | null>(null)
  const [bids, setBids] = useState<Bid[]>([])
  const [loading, setLoading] = useState(true)
  const [bidValue, setBidValue] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [currentBid, setCurrentBid] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [broadcastChannel, setBroadcastChannel] = useState<any>(null)

  useEffect(() => {
    if (!id) return

    const loadData = async () => {
      await fetchItem()
      await fetchBids()
    }

    loadData()

    // Realtime channel for this item
    const channel = supabase.channel(`item-room:${id}`)

    // Listen to item changes (admin editing)
    channel.on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'items',
        filter: `id=eq.${id}`,
      },
      () => fetchItem()
    )

    // Listen to new bids (any user placing a bid)
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'bids',
        filter: `item_id=eq.${id}`,
      },
      async (payload: any) => {
        const newBid = payload.new

        // Only show toast if it's NOT your own bid
        if (newBid.user_id !== user?.id) {
          // Fetch user name for toast
          const { data: bidUser } = await supabase
            .from('users')
            .select('name')
            .eq('id', newBid.user_id)
            .single()

          const userName = bidUser?.name?.split(' ')[0] || 'Alguém'
          toast.info(
            `${userName} deu um lance de ${formatCurrency(newBid.value)}! 💰`
          )
        }

        fetchBids()
      }
    )

    // Listen to status changes (timer reaching zero)
    channel.on('broadcast', { event: 'status-changed' }, () => {
      fetchItem()
    })

    channel.subscribe()
    setBroadcastChannel(channel)

    return () => {
      supabase.removeChannel(channel)
      setBroadcastChannel(null)
    }
  }, [id])

  // Update countdown timer every second
  useEffect(() => {
    if (!item) return

    const updateTimer = () => {
      if (item.is_accepting_bids && item.seconds_until_end) {
        setTimeRemaining(item.seconds_until_end)
      } else if (
        item.computed_status === 'scheduled' &&
        item.seconds_until_start
      ) {
        setTimeRemaining(item.seconds_until_start)
      } else {
        setTimeRemaining(null)
      }
    }

    updateTimer()
    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev && prev > 0) {
          const newValue = prev - 1

          // When timer hits zero, refetch and broadcast
          if (newValue <= 0) {
            fetchItem()
            broadcastChannel?.send({
              type: 'broadcast',
              event: 'status-changed',
              payload: { changedAt: new Date().toISOString() },
            })
            return null
          }

          return newValue
        }
        return null
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [item, broadcastChannel])

  const fetchItem = async () => {
    if (!id) return

    try {
      const { data, error } = await supabase
        .from('items_with_status')
        .select('*')
        .eq('id', id)
        .single()

      if (error) throw error
      setItem(data)
      // Don't reset currentBid here - let fetchBids handle it
    } catch (err) {
      console.error('Error fetching item:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchBids = async () => {
    if (!id) return

    try {
      const { data, error } = await supabase
        .from('bids')
        .select('*, users(name)')
        .eq('item_id', id)
        .eq('is_deleted', false)
        .order('value', { ascending: false })
        .limit(10)

      if (error) throw error

      setBids(data || [])

      // Update current bid
      if (data && data.length > 0) {
        setCurrentBid(data[0].value)
      } else if (item) {
        setCurrentBid(item.starting_bid || 0)
      }
    } catch (err) {
      console.error('Error fetching bids:', err)
    }
  }

  const handlePlaceBid = async () => {
    if (!item || !item.id || !user || !bidValue) return

    const bidAmount = parseFloat(bidValue)
    const minBid = currentBid + (item.bid_step || 1)

    if (isNaN(bidAmount)) {
      toast.error('Digite um valor válido')
      return
    }

    if (bidAmount < minBid) {
      toast.error(`Lance mínimo: ${formatCurrency(minBid)}`)
      return
    }

    setSubmitting(true)

    // Optimistic update
    const optimisticBid: Bid = {
      id: crypto.randomUUID(),
      item_id: item.id,
      user_id: user.id,
      value: bidAmount,
      is_deleted: false,
      created_at: new Date().toISOString(),
      users: { name: profile?.name || 'Você' },
    }

    const previousState = { bid: currentBid, bids }
    setCurrentBid(bidAmount)
    setBids([optimisticBid, ...bids])

    try {
      const { error } = await supabase.from('bids').insert({
        item_id: item.id,
        user_id: user.id,
        value: bidAmount,
      })

      if (error) throw error

      setBidValue('')
      toast.success(`Lance de ${formatCurrency(bidAmount)} realizado! 🎉`)
    } catch (err) {
      // Rollback on error
      setCurrentBid(previousState.bid)
      setBids(previousState.bids)
      toast.error('Erro ao dar lance. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (!item) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <h2 className="text-2xl font-bold">Item não encontrado</h2>
          <Button onClick={() => navigate('/')}>Voltar para Home</Button>
        </div>
      </div>
    )
  }

  const isDonation = item.is_donation || false
  const minBid = currentBid + (item.bid_step || 1)

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="size-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Image Carousel */}
          <div className="space-y-4">
            <Carousel className="w-full">
              <CarouselContent>
                {item.photos && item.photos.length > 0 ? (
                  item.photos.map((photo, index) => (
                    <CarouselItem key={index}>
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                        <img
                          src={photo}
                          alt={`${item.title} - ${index + 1}`}
                          className="object-contain w-full h-full"
                        />
                      </div>
                    </CarouselItem>
                  ))
                ) : (
                  <CarouselItem>
                    <div className="relative aspect-video bg-muted rounded-lg" />
                  </CarouselItem>
                )}
              </CarouselContent>
              {item.photos && item.photos.length > 1 && (
                <>
                  <CarouselPrevious />
                  <CarouselNext />
                </>
              )}
            </Carousel>
          </div>

          {/* Right: Item Details & Bidding */}
          <div className="space-y-6">
            {/* Title and Status */}
            <div>
              <div className="flex items-start justify-between gap-4 mb-2">
                <h1 className="text-3xl font-bold">{item.title}</h1>
                <div className="flex gap-2">
                  {item.computed_status === 'scheduled' && (
                    <Badge variant="default">Em Breve</Badge>
                  )}
                  {item.is_accepting_bids && (
                    <Badge variant="destructive" className="animate-pulse">
                      Ao Vivo
                    </Badge>
                  )}
                  {item.computed_status === 'finished' && (
                    <Badge variant="secondary">Encerrado</Badge>
                  )}
                  {isDonation && (
                    <Badge variant="outline">
                      <Heart className="size-3 mr-1 fill-current" />
                      Doação
                    </Badge>
                  )}
                </div>
              </div>

              {/* Countdown Timer */}
              {timeRemaining !== null && timeRemaining > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-4" />
                  <span className="text-sm font-medium">
                    {item.is_accepting_bids
                      ? `Termina em ${formatTimeRemaining(timeRemaining)}`
                      : `Começa em ${formatTimeRemaining(timeRemaining)}`}
                  </span>
                </div>
              )}
            </div>

            {/* Current Bid */}
            {!isDonation && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground font-normal">
                    Lance Atual
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-4xl font-bold text-primary">
                    {formatCurrency(currentBid)}
                  </div>
                  {item.is_accepting_bids && (
                    <p className="text-sm text-muted-foreground mt-2">
                      Lance mínimo: {formatCurrency(minBid)}
                    </p>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Bidding Form */}
            {item.is_accepting_bids && !isDonation && user && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Fazer Lance</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      placeholder={formatCurrency(minBid)}
                      value={bidValue}
                      onChange={(e) => setBidValue(e.target.value)}
                      step={item.bid_step || 1}
                      min={minBid}
                      disabled={submitting}
                    />
                    <Button onClick={handlePlaceBid} disabled={submitting}>
                      {submitting ? (
                        <Spinner className="size-4" />
                      ) : (
                        <>
                          <TrendingUp className="size-4 mr-2" />
                          Dar Lance
                        </>
                      )}
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setBidValue(minBid.toString())}
                    >
                      {formatCurrency(minBid)}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setBidValue(
                          (minBid + (item.bid_step || 1) * 5).toString()
                        )
                      }
                    >
                      {formatCurrency(minBid + (item.bid_step || 1) * 5)}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setBidValue(
                          (minBid + (item.bid_step || 1) * 10).toString()
                        )
                      }
                    >
                      {formatCurrency(minBid + (item.bid_step || 1) * 10)}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {!user && item.is_accepting_bids && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-center text-muted-foreground mb-4">
                    Faça login para dar lances
                  </p>
                  <Button className="w-full" onClick={() => navigate('/login')}>
                    Fazer Login
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Description */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Descrição</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {item.description}
                </p>
              </CardContent>
            </Card>

            {/* Bid History */}
            {!isDonation && bids.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Histórico de Lances</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {bids.map((bid, index) => (
                      <div
                        key={bid.id}
                        className="flex items-center justify-between py-2 border-b last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`size-8 rounded-full flex items-center justify-center text-xs font-bold ${
                              index === 0
                                ? 'bg-primary text-primary-foreground'
                                : 'bg-muted'
                            }`}
                          >
                            #{index + 1}
                          </div>
                          <div>
                            <p className="font-medium">
                              {bid.users?.name || 'Anônimo'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {bid.created_at
                                ? formatRelativeTime(bid.created_at)
                                : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-lg">
                            {formatCurrency(bid.value)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
