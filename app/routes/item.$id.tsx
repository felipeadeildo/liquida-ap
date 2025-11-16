import { ArrowLeft, ChevronDown, Clock, Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { BidChart } from '~/components/auction/bid-chart'
import { ImageLightbox } from '~/components/auction/image-lightbox'
import { SidebarGallery } from '~/components/auction/sidebar-gallery'
import { StickyBidBar } from '~/components/auction/sticky-bid-bar'
import { ThumbnailStrip } from '~/components/auction/thumbnail-strip'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '~/components/ui/collapsible'
import { ScrollArea } from '~/components/ui/scroll-area'
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
  const [currentBid, setCurrentBid] = useState(0)
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [broadcastChannel, setBroadcastChannel] = useState<any>(null)
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [chartOpen, setChartOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)

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

  const handlePlaceBid = async (bidAmount: number) => {
    if (!item || !item.id || !user) return

    const minBid = currentBid + (item.bid_step || 1)

    if (bidAmount < minBid) {
      toast.error(`Lance mínimo: ${formatCurrency(minBid)}`)
      return
    }

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

      toast.success(`Lance de ${formatCurrency(bidAmount)} realizado! 🎉`)
    } catch (err) {
      // Rollback on error
      setCurrentBid(previousState.bid)
      setBids(previousState.bids)
      toast.error('Erro ao dar lance. Tente novamente.')
      throw err
    }
  }

  const handleImageClick = (index: number) => {
    setLightboxIndex(index)
    setLightboxOpen(true)
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
    <div className="min-h-screen bg-background pb-32 lg:pb-0">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="size-4 mr-2" />
            Voltar
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-4 md:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-[160px_1fr] gap-6">
          {/* Desktop Sidebar Gallery */}
          <aside className="hidden lg:block">
            <SidebarGallery
              photos={item.photos || []}
              onImageClick={handleImageClick}
            />
          </aside>

          {/* Main Column */}
          <div className="space-y-4 md:space-y-6">
            {/* Title + Status + Countdown */}
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-2xl md:text-3xl font-bold flex-1">
                  {item.title}
                </h1>
                <div className="flex gap-1.5 flex-wrap justify-end">
                  {item.computed_status === 'scheduled' && (
                    <Badge variant="default" className="text-xs">
                      Em Breve
                    </Badge>
                  )}
                  {item.is_accepting_bids && (
                    <Badge
                      variant="destructive"
                      className="animate-pulse text-xs"
                    >
                      Ao Vivo
                    </Badge>
                  )}
                  {item.computed_status === 'finished' && (
                    <Badge variant="secondary" className="text-xs">
                      Encerrado
                    </Badge>
                  )}
                  {isDonation && (
                    <Badge variant="outline" className="text-xs">
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

            {/* Current Bid - NO CARD */}
            {!isDonation && (
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Lance atual</p>
                <p className="text-4xl md:text-5xl font-bold text-primary">
                  {formatCurrency(currentBid)}
                </p>
                {item.is_accepting_bids && (
                  <p className="text-xs md:text-sm text-muted-foreground">
                    Lance mínimo: {formatCurrency(minBid)}
                  </p>
                )}
              </div>
            )}

            {/* Mobile Thumbnail Strip */}
            <div className="lg:hidden">
              <ThumbnailStrip
                photos={item.photos || []}
                onImageClick={handleImageClick}
              />
            </div>

            {/* Description - NO CARD */}
            <div className="space-y-2">
              <h2 className="text-lg font-semibold">Descrição</h2>
              <p className="text-muted-foreground whitespace-pre-wrap">
                {item.description}
              </p>
            </div>

            {/* Collapsible Chart */}
            {!isDonation && (
              <Collapsible open={chartOpen} onOpenChange={setChartOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    size="lg"
                  >
                    <span className="flex items-center gap-2">
                      📊 Gráfico de Lances
                    </span>
                    <ChevronDown
                      className={`size-4 transition-transform ${
                        chartOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <BidChart
                    itemId={item.id || ''}
                    startingBid={item.starting_bid || 0}
                  />
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Collapsible History */}
            {!isDonation && bids.length > 0 && (
              <Collapsible open={historyOpen} onOpenChange={setHistoryOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-between"
                    size="lg"
                  >
                    <span className="flex items-center gap-2">
                      📜 Histórico de Lances
                      <Badge variant="secondary" className="ml-2">
                        {bids.length}
                      </Badge>
                    </span>
                    <ChevronDown
                      className={`size-4 transition-transform ${
                        historyOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <ScrollArea className="h-[300px] border rounded-lg p-4">
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
                              <p className="font-medium text-sm">
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
                            <p className="font-bold text-base md:text-lg">
                              {formatCurrency(bid.value)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Desktop Bid Form (not sticky, at bottom of content) */}
            {item.is_accepting_bids && !isDonation && user && (
              <div className="hidden lg:block">
                <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
                  <h3 className="text-lg font-semibold">Fazer Lance</h3>
                  <StickyBidBar
                    minBid={minBid}
                    bidStep={item.bid_step || 1}
                    onPlaceBid={handlePlaceBid}
                    disabled={!item.is_accepting_bids}
                    className="relative border-0 p-0 shadow-none bg-transparent"
                  />
                </div>
              </div>
            )}

            {/* Login prompt for non-authenticated users */}
            {!user && item.is_accepting_bids && (
              <div className="hidden lg:block">
                <div className="border rounded-lg p-6 text-center space-y-4 bg-muted/30">
                  <p className="text-sm text-muted-foreground">
                    Faça login para dar lances
                  </p>
                  <Button
                    className="w-full max-w-xs"
                    onClick={() => navigate('/login')}
                  >
                    Fazer Login
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Mobile Sticky Bid Bar */}
      {item.is_accepting_bids && !isDonation && user && (
        <StickyBidBar
          className="lg:hidden"
          minBid={minBid}
          bidStep={item.bid_step || 1}
          onPlaceBid={handlePlaceBid}
          disabled={!item.is_accepting_bids}
        />
      )}

      {/* Mobile Login Prompt Sticky */}
      {!user && item.is_accepting_bids && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-sm border-t shadow-2xl p-4">
          <div className="container mx-auto max-w-2xl space-y-2">
            <p className="text-sm text-center text-muted-foreground">
              Faça login para dar lances
            </p>
            <Button
              className="w-full min-h-12"
              onClick={() => navigate('/login')}
            >
              Fazer Login
            </Button>
          </div>
        </div>
      )}

      {/* Image Lightbox */}
      <ImageLightbox
        photos={item.photos || []}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </div>
  )
}
