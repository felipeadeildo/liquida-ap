import confetti from 'canvas-confetti'
import { ArrowLeft, Bell, BellOff } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router'
import { toast } from 'sonner'
import { AuctionStatusBadge } from '~/components/auction/auction-status-badge'
import { BidControlPanel } from '~/components/auction/bid-control-panel'
import { BidLeaderboard } from '~/components/auction/bid-leaderboard'
import { CountdownTimer } from '~/components/auction/countdown-timer'
import { DonationClaimPanel } from '~/components/auction/donation-claim-panel'
import { HeroCarousel } from '~/components/auction/hero-carousel'
import { PresenceIndicator } from '~/components/auction/presence-indicator'
import { Button } from '~/components/ui/button'
import { Spinner } from '~/components/ui/spinner'
import { useAuth } from '~/lib/auth'
import { supabase } from '~/lib/supabase'
import { cn } from '~/lib/utils'
import type { Tables } from '~/types/database'
import type { Route } from './+types/item.$id'

type ItemWithStatus = Tables<'items_with_status'>
type Bid = Tables<'bids'> & {
  users_public: {
    id: string | null
    name: string | null
  } | null
}
type DonationClaim = Tables<'donation_claims'>

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
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
  const [donationClaim, setDonationClaim] = useState<DonationClaim | null>(null)
  const [isAlreadyClaimed, setIsAlreadyClaimed] = useState(false)
  const [participantCount, setParticipantCount] = useState(0)
  const [isWatching, setIsWatching] = useState(false)
  const [watchLoading, setWatchLoading] = useState(false)

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
            .from('users_public')
            .select('name')
            .eq('id', newBid.user_id)
            .single()

          const userName = bidUser?.name?.split(' ')[0] || 'Alguém'
          toast.info(
            `${userName} deu um lance de ${formatCurrency(newBid.value)}`
          )

          // Play sound effect
          try {
            const audio = new Audio('/sounds/new-bid.mp3')
            audio.volume = 0.2
            audio.play().catch(() => {
              // Ignore if sound fails to play
            })
          } catch {
            // Ignore sound errors
          }
        }

        fetchBids()
      }
    )

    // Listen to status changes (timer reaching zero)
    channel.on('broadcast', { event: 'status-changed' }, () => {
      fetchItem()
    })

    // Listen to donation claim changes
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'donation_claims',
        filter: `item_id=eq.${id}`,
      },
      () => {
        fetchDonationClaims()
      }
    )

    channel.subscribe()
    setBroadcastChannel(channel)

    return () => {
      supabase.removeChannel(channel)
      setBroadcastChannel(null)
    }
  }, [id, user?.id])

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

  // Fetch donation claims when item is loaded and is a donation
  useEffect(() => {
    if (item?.is_donation) {
      fetchDonationClaims()
    }
  }, [item?.is_donation, user?.id, id])

  // Fetch watch status when user and item are loaded
  useEffect(() => {
    if (user && id) {
      fetchWatchStatus()
    }
  }, [user?.id, id])

  const fetchWatchStatus = async () => {
    if (!user || !id) return

    try {
      const { data, error } = await supabase
        .from('item_watch')
        .select('id')
        .eq('user_id', user.id)
        .eq('item_id', id)
        .maybeSingle()

      if (error) throw error
      setIsWatching(!!data)
    } catch (err) {
      console.error('Error fetching watch status:', err)
    }
  }

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
      // Fetch bids
      const { data: bidsData, error: bidsError } = await supabase
        .from('bids')
        .select('*')
        .eq('item_id', id)
        .eq('is_deleted', false)
        .order('value', { ascending: false })

      if (bidsError) throw bidsError

      // Fetch user names separately from public view
      const userIds = [...new Set(bidsData?.map((b) => b.user_id) || [])]
      const { data: usersData } = await supabase
        .from('users_public')
        .select('id, name')
        .in('id', userIds)

      // Map user names to bids
      const usersMap = new Map(usersData?.map((u) => [u.id, u]) || [])
      const bidsWithUsers =
        bidsData?.map((bid) => ({
          ...bid,
          users_public: usersMap.get(bid.user_id) || null,
        })) || []

      setBids(bidsWithUsers)

      // Update current bid - only set if there are bids
      if (bidsWithUsers && bidsWithUsers.length > 0) {
        setCurrentBid(bidsWithUsers[0].value)
      } else {
        setCurrentBid(0)
      }
    } catch (err) {
      console.error('Error fetching bids:', err)
    }
  }

  const fetchDonationClaims = async () => {
    if (!id) return

    try {
      // Get all claims for this item
      const { data: allClaims, error: allError } = await supabase
        .from('donation_claims')
        .select('*')
        .eq('item_id', id)

      if (allError) throw allError

      // Count pending participants (only those who are still in the running)
      const pendingCount =
        allClaims?.filter((claim) => claim.status === 'pending').length || 0
      setParticipantCount(pendingCount)

      // Check if someone else already has an approved/delivered claim
      const approvedByOther = allClaims?.find(
        (claim) =>
          (claim.status === 'approved' || claim.status === 'delivered') &&
          claim.user_id !== user?.id
      )

      if (approvedByOther) {
        setIsAlreadyClaimed(true)
        setDonationClaim(null)
        return
      }

      // Get user's own claim if exists
      if (user) {
        const { data: userClaim, error: userError } = await supabase
          .from('donation_claims')
          .select('*')
          .eq('item_id', id)
          .eq('user_id', user.id)
          .maybeSingle()

        if (userError) throw userError
        setDonationClaim(userClaim)
      }

      setIsAlreadyClaimed(false)
    } catch (err) {
      console.error('Error fetching donation claims:', err)
    }
  }

  const handlePlaceBid = async (bidAmount: number) => {
    if (!item || !item.id || !user) return

    // If no bids, minimum is starting_bid. Otherwise, current bid + step
    const minBid =
      bids.length === 0
        ? item.starting_bid || 0
        : currentBid + (item.bid_step || 1)

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
      users_public: {
        id: user.id,
        name: profile?.name || 'Você',
      },
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

      toast.success(
        `Lance de ${formatCurrency(bidAmount)} realizado com sucesso!`
      )

      // Check if user is now winning
      const isNowWinning = bids.length === 0 || bidAmount > bids[0].value

      if (isNowWinning) {
        // Trigger confetti
        confetti({
          particleCount: 150,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#8b5cf6', '#f97316', '#a78bfa'], // primary, destructive, chart-2 themed
        })
      }
    } catch (err) {
      // Rollback on error
      setCurrentBid(previousState.bid)
      setBids(previousState.bids)
      toast.error('Erro ao dar lance. Tente novamente.')
      throw err
    }
  }

  const handleClaimDonation = async () => {
    if (!item || !item.id || !user) return

    try {
      const { error } = await supabase.from('donation_claims').insert({
        item_id: item.id,
        user_id: user.id,
        status: 'pending',
      })

      if (error) throw error

      toast.success('Você entrou no sorteio!')

      // Refetch claims
      await fetchDonationClaims()
    } catch (err: any) {
      if (err?.message?.includes('duplicate key')) {
        toast.error('Você já está participando deste sorteio.')
      } else {
        toast.error('Erro ao entrar no sorteio. Tente novamente.')
      }
      throw err
    }
  }

  const handleToggleWatch = async () => {
    if (!item || !item.id || !user) return

    setWatchLoading(true)

    try {
      if (isWatching) {
        // Unwatch - remove from item_watch
        const { error } = await supabase
          .from('item_watch')
          .delete()
          .eq('user_id', user.id)
          .eq('item_id', item.id)

        if (error) throw error

        setIsWatching(false)
        toast.success('Você não receberá mais notificações deste item')
      } else {
        // Watch - add to item_watch
        const { error } = await supabase.from('item_watch').insert({
          user_id: user.id,
          item_id: item.id,
        })

        if (error) throw error

        setIsWatching(true)
        toast.success('Você receberá emails quando for superado neste item!')
      }
    } catch (err: any) {
      toast.error('Erro ao atualizar notificações. Tente novamente.')
      console.error('Error toggling watch:', err)
    } finally {
      setWatchLoading(false)
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
  // If no bids, minimum is starting_bid. Otherwise, current bid + step
  const minBid =
    bids.length === 0
      ? item.starting_bid || 0
      : currentBid + (item.bid_step || 1)

  // Determine user's rank
  let userRank: number | null = null
  let isWinning = false
  if (user && bids.length > 0) {
    const userBidIndex = bids.findIndex((bid) => bid.user_id === user.id)
    if (userBidIndex !== -1) {
      userRank = userBidIndex + 1
      isWinning = userBidIndex === 0
    }
  }

  // Status for badges
  const status =
    item.computed_status === 'scheduled'
      ? 'scheduled'
      : item.is_accepting_bids
        ? 'live'
        : 'finished'

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="size-4 mr-2" />
            Voltar
          </Button>
          {user && !isDonation && (
            <Button
              variant={isWatching ? 'default' : 'outline'}
              size="sm"
              onClick={handleToggleWatch}
              disabled={watchLoading}
              className="gap-2"
            >
              {isWatching ? (
                <>
                  <Bell className="size-4" />
                  <span className="hidden sm:inline">Notificando</span>
                </>
              ) : (
                <>
                  <BellOff className="size-4" />
                  <span className="hidden sm:inline">Notificar</span>
                </>
              )}
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 md:px-6 py-3 md:py-4 pb-[400px] lg:pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-4 lg:gap-6">
          {/* Left Column - Hero Carousel (60% on desktop) */}
          <div className="space-y-3">
            <HeroCarousel photos={item.photos || []} />

            {/* Description - Desktop Only */}
            <div className="hidden lg:block space-y-1">
              <h2 className="text-base font-semibold">Descrição</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {item.description}
              </p>
            </div>
          </div>

          {/* Right Column - Info & Controls (40% on desktop) */}
          <div className="space-y-3">
            {/* Title + Badges */}
            <div className="space-y-1.5">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-xl md:text-2xl font-bold flex-1">
                  {item.title}
                </h1>
                <AuctionStatusBadge
                  status={status}
                  isDonation={isDonation}
                  seconds={timeRemaining}
                />
              </div>

              {/* Countdown + Presence */}
              <div className="flex items-center gap-4 flex-wrap">
                <CountdownTimer
                  seconds={timeRemaining}
                  isStartCountdown={status === 'scheduled'}
                />
                {item.is_accepting_bids && (
                  <PresenceIndicator itemId={item.id || ''} />
                )}
              </div>
            </div>

            {/* Current Bid */}
            {!isDonation && (
              <div className="space-y-0.5 py-3 border-y">
                <p className="text-xs text-muted-foreground">
                  {bids.length === 0 ? 'Lance inicial' : 'Lance atual'}
                </p>
                <p className="text-3xl md:text-4xl font-bold text-primary">
                  {formatCurrency(
                    bids.length === 0 ? item.starting_bid || 0 : currentBid
                  )}
                </p>
                {item.is_accepting_bids && (
                  <p className="text-[10px] md:text-xs text-muted-foreground">
                    {bids.length === 0
                      ? `Lance mínimo: ${formatCurrency(minBid)}`
                      : `Próximo mínimo: ${formatCurrency(minBid)}`}
                  </p>
                )}
              </div>
            )}

            {/* Bid Controls - Desktop */}
            {item.is_accepting_bids && !isDonation && user && (
              <div className="hidden lg:block">
                <BidControlPanel
                  minBid={minBid}
                  bidStep={item.bid_step || 1}
                  onPlaceBid={handlePlaceBid}
                  disabled={!item.is_accepting_bids}
                  userRank={userRank}
                  isWinning={isWinning}
                />
              </div>
            )}

            {/* Donation Claim Panel - Desktop */}
            {isDonation && user && (
              <div className="hidden lg:block">
                <DonationClaimPanel
                  onClaim={handleClaimDonation}
                  disabled={!item.is_accepting_bids}
                  existingClaim={
                    donationClaim
                      ? {
                          status: donationClaim.status as
                            | 'pending'
                            | 'approved'
                            | 'rejected'
                            | 'delivered',
                          created_at: donationClaim.created_at,
                        }
                      : null
                  }
                  isAlreadyClaimed={isAlreadyClaimed}
                  participantCount={participantCount}
                />
              </div>
            )}

            {/* Login Prompt - Desktop */}
            {!user && item.is_accepting_bids && (
              <div className="hidden lg:block">
                <div className="border rounded-lg p-4 text-center space-y-3 bg-muted/30">
                  <p className="text-xs text-muted-foreground">
                    {isDonation
                      ? 'Faça login para participar do sorteio'
                      : 'Faça login para participar do leilão'}
                  </p>
                  <Button
                    size="sm"
                    className="w-full max-w-xs"
                    onClick={() => navigate('/login')}
                  >
                    Fazer Login
                  </Button>
                </div>
              </div>
            )}

            {/* Bid Leaderboard */}
            {!isDonation && (
              <BidLeaderboard
                bids={bids}
                currentUserId={user?.id}
                limit={5}
                className="hidden lg:block"
              />
            )}

            {/* Mobile: Show top 3 bids */}
            {!isDonation && (
              <BidLeaderboard
                bids={bids}
                currentUserId={user?.id}
                limit={3}
                className="lg:hidden"
              />
            )}

            {/* Description - Mobile Only */}
            <div className="lg:hidden space-y-1">
              <h2 className="text-base font-semibold">Descrição</h2>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                {item.description}
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Sticky Bid Panel */}
      {item.is_accepting_bids && !isDonation && user && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t shadow-2xl p-2 max-h-[60vh] overflow-y-auto">
          <div className="container mx-auto max-w-2xl">
            <BidControlPanel
              minBid={minBid}
              bidStep={item.bid_step || 1}
              onPlaceBid={handlePlaceBid}
              disabled={!item.is_accepting_bids}
              userRank={userRank}
              isWinning={isWinning}
              className="shadow-none border-0"
            />
          </div>
        </div>
      )}

      {/* Mobile Sticky Donation Panel */}
      {isDonation && user && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t shadow-2xl p-2">
          <div className="container mx-auto max-w-2xl">
            <DonationClaimPanel
              onClaim={handleClaimDonation}
              disabled={!item.is_accepting_bids}
              existingClaim={
                donationClaim
                  ? {
                      status: donationClaim.status as
                        | 'pending'
                        | 'approved'
                        | 'rejected'
                        | 'delivered',
                      created_at: donationClaim.created_at,
                    }
                  : null
              }
              isAlreadyClaimed={isAlreadyClaimed}
              participantCount={participantCount}
              className="shadow-none border-0"
            />
          </div>
        </div>
      )}

      {/* Mobile Login Prompt Sticky */}
      {!user && item.is_accepting_bids && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background border-t shadow-2xl p-3">
          <div className="container mx-auto max-w-2xl space-y-1.5">
            <p className="text-xs text-center text-muted-foreground">
              {isDonation
                ? 'Faça login para participar do sorteio'
                : 'Faça login para participar do leilão'}
            </p>
            <Button
              size="sm"
              className="w-full"
              onClick={() => navigate('/login')}
            >
              Fazer Login
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
