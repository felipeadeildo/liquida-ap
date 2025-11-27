import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Copy,
  Gift,
  MessageCircle,
  Package,
  Sparkles,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Spinner } from '~/components/ui/spinner'
import { useAuth } from '~/lib/auth'
import { formatCurrency, formatDate, formatRelativeDate } from '~/lib/format'
import { supabase } from '~/lib/supabase'
import type { Tables } from '~/types/database'
import type { Route } from './+types/profile'

type WonItem = Tables<'finishes'>
type DonationWon = {
  id: string
  item_id: string
  status: string
  created_at: string
  item: {
    title: string
    photos: string[]
    auction_end: string | null
  } | null
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Meu Perfil - Liquida AP' },
    { name: 'description', content: 'Veja os itens que você ganhou no leilão' },
  ]
}

export default function Profile() {
  const { user, profile, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [wonItems, setWonItems] = useState<WonItem[]>([])
  const [donationsWon, setDonationsWon] = useState<DonationWon[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/login')
    }
  }, [authLoading, user, navigate])

  // Fetch won items
  useEffect(() => {
    if (!user) return

    fetchWonItems()

    // Real-time: subscribe to items table updates
    // (finishes is a view, doesn't support real-time directly)
    const channel = supabase
      .channel('finishes-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'items',
        },
        () => fetchWonItems()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  const fetchWonItems = async () => {
    if (!user) return

    try {
      setLoading(true)
      setError(null)

      // Fetch auction wins
      const { data: auctionData, error: auctionError } = await supabase
        .from('finishes')
        .select('*')
        .eq('user_id', user.id) // Filter by current user, even if admin
        .order('finished_at', { ascending: false })

      if (auctionError) throw auctionError
      setWonItems(auctionData || [])

      // Fetch donation wins (approved or delivered)
      const { data: donationData, error: donationError } = await supabase
        .from('donation_claims')
        .select(
          `
          id,
          item_id,
          status,
          created_at,
          items:item_id (
            title,
            photos,
            auction_end
          )
        `
        )
        .eq('user_id', user.id)
        .in('status', ['approved', 'delivered'])
        .order('created_at', { ascending: false })

      if (donationError) throw donationError

      // Transform data to match DonationWon type
      const transformedDonations = (donationData || []).map((claim: any) => ({
        id: claim.id,
        item_id: claim.item_id,
        status: claim.status,
        created_at: claim.created_at,
        item: claim.items
          ? {
              title: claim.items.title,
              photos: claim.items.photos,
              auction_end: claim.items.auction_end,
            }
          : null,
      }))

      setDonationsWon(transformedDonations)
    } catch (err) {
      console.error('Error fetching won items:', err)
      setError('Erro ao carregar seus itens ganhos')
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  if (!user) return null

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <ProfileHeader profile={profile} navigate={navigate} />
      <main className="flex-1 p-4 md:p-6">
        <div className="container mx-auto max-w-5xl space-y-6">
          {loading && <LoadingState />}
          {error && <ErrorState message={error} onRetry={fetchWonItems} />}
          {!loading && !error && (
            <>
              <ProfileStats wonItems={wonItems} donationsWon={donationsWon} />
              <WonItemsList items={wonItems} navigate={navigate} />
              {donationsWon.length > 0 && (
                <DonationsWonList items={donationsWon} />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  )
}

function ProfileHeader({
  profile,
  navigate,
}: {
  profile: Tables<'users'> | null
  navigate: (path: string) => void
}) {
  return (
    <header className="border-b bg-background sticky top-0 z-30">
      <div className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
            <ArrowLeft className="size-4 mr-2" />
            Voltar
          </Button>
          <div className="h-6 w-px bg-border hidden sm:block" />
          <div className="hidden sm:block">
            <h1 className="text-xl md:text-2xl font-bold">Meu Perfil</h1>
            <p className="text-xs text-muted-foreground">{profile?.email}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {profile?.is_insper && (
            <Badge variant="secondary" className="hidden sm:inline-flex">
              Insper
            </Badge>
          )}
        </div>
      </div>
    </header>
  )
}

function ProfileStats({
  wonItems,
  donationsWon,
}: {
  wonItems: WonItem[]
  donationsWon: DonationWon[]
}) {
  const totalValue = wonItems.reduce(
    (sum, item) => sum + Number(item.final_value || 0),
    0
  )
  const pendingCount = wonItems.filter(
    (i) => (i.payment_status || 'pending') === 'pending'
  ).length
  const deliveredCount = wonItems.filter(
    (i) => i.payment_status === 'delivered'
  ).length

  const totalItems = wonItems.length + donationsWon.length

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
      <Card className="p-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Total Ganhos</p>
          <p className="text-2xl md:text-3xl font-bold">{totalItems}</p>
          <p className="text-[10px] text-muted-foreground">
            {wonItems.length} leilão + {donationsWon.length} doação
          </p>
        </div>
      </Card>
      <Card className="p-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Valor Total</p>
          <p className="text-2xl md:text-3xl font-bold text-primary">
            {formatCurrency(totalValue)}
          </p>
        </div>
      </Card>
      <Card className="p-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Pendentes</p>
          <p className="text-2xl md:text-3xl font-bold text-destructive">
            {pendingCount}
          </p>
        </div>
      </Card>
      <Card className="p-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Entregues</p>
          <p className="text-2xl md:text-3xl font-bold text-green-600">
            {deliveredCount}
          </p>
        </div>
      </Card>
    </div>
  )
}

function WonItemsList({
  items,
  navigate,
}: {
  items: WonItem[]
  navigate: (path: string) => void
}) {
  if (items.length === 0) {
    return <EmptyState navigate={navigate} />
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Sparkles className="size-5 md:size-6 text-primary" />
          Meus Itens Arrematados
        </h2>
        <p className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? 'item' : 'itens'}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {items.map((item) => (
          <WonItemCard key={item.item_id} item={item} />
        ))}
      </div>
    </div>
  )
}

function WonItemCard({ item }: { item: WonItem }) {
  const status = (item.payment_status || 'pending') as
    | 'pending'
    | 'paid'
    | 'delivered'
  const showPixInstructions = status === 'pending'

  return (
    <Card className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex-1 space-y-1">
          <h3 className="text-lg md:text-xl font-bold">
            {item.item_title || 'Item sem título'}
          </h3>
          <p className="text-xs text-muted-foreground">
            Arrematado {formatRelativeDate(item.finished_at)} •{' '}
            {formatDate(item.finished_at)}
          </p>
        </div>
        <PaymentStatusBadge status={status} />
      </div>

      <div className="flex items-baseline gap-2 border-t pt-3">
        <span className="text-sm text-muted-foreground">Valor final:</span>
        <span className="text-2xl md:text-3xl font-bold text-primary">
          {formatCurrency(Number(item.final_value || 0))}
        </span>
      </div>

      {showPixInstructions && <PixInstructions value={item.final_value} />}
      {status === 'paid' && <PaidMessage />}
      {status === 'delivered' && <DeliveredMessage />}
    </Card>
  )
}

function PaymentStatusBadge({
  status,
}: {
  status: 'pending' | 'paid' | 'delivered'
}) {
  const config = {
    pending: {
      variant: 'destructive' as const,
      label: 'Pagamento Pendente',
      icon: Clock,
    },
    paid: {
      variant: 'default' as const,
      label: 'Pago',
      icon: CheckCircle2,
    },
    delivered: {
      variant: 'secondary' as const,
      label: 'Entregue',
      icon: Package,
    },
  }[status]

  const Icon = config.icon

  return (
    <Badge variant={config.variant} className="gap-1.5">
      <Icon className="size-3" />
      {config.label}
    </Badge>
  )
}

function PixInstructions({ value }: { value: string | number | null }) {
  const pixKey = import.meta.env.VITE_PIX_KEY || 'nu@lipe.me'
  const adminWhatsApp = import.meta.env.VITE_ADMIN_WHATSAPP || '5582994011841'
  const [copied, setCopied] = useState(false)

  const handleCopyPixKey = async () => {
    try {
      await navigator.clipboard.writeText(pixKey)
      setCopied(true)
      toast.success('Chave PIX copiada!')
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast.error('Erro ao copiar chave PIX')
    }
  }

  const openWhatsApp = () => {
    const message = `Olá! Realizei o pagamento de ${formatCurrency(Number(value || 0))} referente ao item ganho no leilão Liquida AP.`
    window.open(
      `https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(message)}`,
      '_blank'
    )
  }

  return (
    <div className="border-2 border-destructive/20 rounded-lg p-4 bg-destructive/5 space-y-3">
      <div className="flex items-center gap-2">
        <Clock className="size-5 text-destructive" />
        <h4 className="font-semibold text-destructive">Aguardando Pagamento</h4>
      </div>
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">
          Faça o pagamento via PIX para a chave abaixo:
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 p-3 bg-muted rounded text-sm font-mono">
            {pixKey}
          </code>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopyPixKey}
            className="shrink-0"
          >
            <Copy className="size-4" />
            {copied ? 'Copiado!' : 'Copiar'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Valor:{' '}
          <span className="font-semibold">
            {formatCurrency(Number(value || 0))}
          </span>
        </p>
      </div>
      <Button variant="default" className="w-full gap-2" onClick={openWhatsApp}>
        <MessageCircle className="size-4" />
        Enviar Comprovante via WhatsApp
      </Button>
    </div>
  )
}

function PaidMessage() {
  return (
    <div className="border border-primary/20 rounded-lg p-4 bg-primary/5 space-y-2">
      <div className="flex items-center gap-2">
        <CheckCircle2 className="size-5 text-primary" />
        <h4 className="font-semibold text-primary">Pagamento Confirmado</h4>
      </div>
      <p className="text-sm text-muted-foreground">
        Seu pagamento foi confirmado! Aguarde instruções para retirada do item.
      </p>
    </div>
  )
}

function DeliveredMessage() {
  return (
    <div className="border border-green-600/20 rounded-lg p-4 bg-green-600/5 space-y-2">
      <div className="flex items-center gap-2">
        <Package className="size-5 text-green-600" />
        <h4 className="font-semibold text-green-600">Item Entregue</h4>
      </div>
      <p className="text-sm text-muted-foreground">
        Este item já foi entregue. Obrigado pela participação!
      </p>
    </div>
  )
}

function EmptyState({ navigate }: { navigate: (path: string) => void }) {
  return (
    <div className="text-center py-12 md:py-16 space-y-4">
      <div className="bg-muted rounded-full p-6 inline-block">
        <Package className="size-12 text-muted-foreground" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl md:text-2xl font-bold">
          Nenhum item ganho ainda
        </h3>
        <p className="text-sm md:text-base text-muted-foreground max-w-md mx-auto">
          Você ainda não ganhou nenhum item nos leilões. Explore os itens
          disponíveis e faça seus lances!
        </p>
      </div>
      <Button onClick={() => navigate('/')} size="lg" className="gap-2">
        <Sparkles className="size-4" />
        Ver Itens Disponíveis
      </Button>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-12">
      <Spinner className="size-8" />
    </div>
  )
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="text-center py-12 space-y-4">
      <div className="bg-destructive/10 rounded-full p-6 inline-block">
        <Clock className="size-12 text-destructive" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold">Erro ao carregar</h3>
        <p className="text-sm text-muted-foreground">{message}</p>
      </div>
      <Button onClick={onRetry} variant="outline">
        Tentar Novamente
      </Button>
    </div>
  )
}

function DonationsWonList({ items }: { items: DonationWon[] }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
          <Gift className="size-5 md:size-6 text-green-600" />
          Minhas Doações Ganhas
        </h2>
        <p className="text-sm text-muted-foreground">
          {items.length} {items.length === 1 ? 'item' : 'itens'}
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4">
        {items.map((donation) => (
          <DonationWonCard key={donation.id} donation={donation} />
        ))}
      </div>
    </div>
  )
}

function DonationWonCard({ donation }: { donation: DonationWon }) {
  const isDelivered = donation.status === 'delivered'
  const adminWhatsApp = import.meta.env.VITE_ADMIN_WHATSAPP || '5582994011841'

  const openWhatsApp = () => {
    const message = `Olá! Ganhei o item "${donation.item?.title || 'sem título'}" no sorteio do Liquida AP. Gostaria de combinar a retirada.`
    window.open(
      `https://wa.me/${adminWhatsApp}?text=${encodeURIComponent(message)}`,
      '_blank'
    )
  }

  return (
    <Card className="p-4 md:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div className="flex gap-3 flex-1">
          {donation.item?.photos && donation.item.photos.length > 0 && (
            <img
              src={donation.item.photos[0]}
              alt={donation.item.title || ''}
              className="size-16 md:size-20 rounded object-cover shrink-0"
            />
          )}
          <div className="flex-1 space-y-1">
            <h3 className="text-lg md:text-xl font-bold">
              {donation.item?.title || 'Item sem título'}
            </h3>
            <p className="text-xs text-muted-foreground">
              Sorteado {formatRelativeDate(donation.created_at)} •{' '}
              {formatDate(donation.created_at)}
            </p>
          </div>
        </div>
        <Badge
          variant={isDelivered ? 'secondary' : 'default'}
          className="gap-1.5 shrink-0"
        >
          {isDelivered ? (
            <>
              <Package className="size-3" />
              Entregue
            </>
          ) : (
            <>
              <CheckCircle2 className="size-3" />
              Aprovado
            </>
          )}
        </Badge>
      </div>

      {!isDelivered && (
        <div className="border border-green-600/20 rounded-lg p-4 bg-green-600/5 space-y-3">
          <div className="flex items-center gap-2">
            <Gift className="size-5 text-green-600" />
            <h4 className="font-semibold text-green-600">
              Parabéns! Você ganhou este item
            </h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Entre em contato para combinar a retirada do item.
          </p>
          <Button
            variant="default"
            className="w-full gap-2"
            onClick={openWhatsApp}
          >
            <MessageCircle className="size-4" />
            Combinar Retirada via WhatsApp
          </Button>
        </div>
      )}

      {isDelivered && (
        <div className="border border-green-600/20 rounded-lg p-4 bg-green-600/5 space-y-2">
          <div className="flex items-center gap-2">
            <Package className="size-5 text-green-600" />
            <h4 className="font-semibold text-green-600">Item Entregue</h4>
          </div>
          <p className="text-sm text-muted-foreground">
            Este item já foi entregue. Obrigado pela participação!
          </p>
        </div>
      )}
    </Card>
  )
}
