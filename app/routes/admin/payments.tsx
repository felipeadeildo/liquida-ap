import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  Mail,
  MessageCircle,
  Package,
  Shield,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Spinner } from '~/components/ui/spinner'
import { useAuth } from '~/lib/auth'
import { formatCurrency, formatDate } from '~/lib/format'
import { supabase } from '~/lib/supabase'
import type { Tables } from '~/types/database'
import type { Route } from './+types/payments'

type WonItem = Tables<'finishes'>
type PaymentStatus = 'pending' | 'paid' | 'delivered'

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Gerenciar Pagamentos - Admin' },
    {
      name: 'description',
      content: 'Gerencie os pagamentos dos itens arrematados',
    },
  ]
}

export default function AdminPayments() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState<WonItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | PaymentStatus>('all')

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/')
    }
  }, [authLoading, user, isAdmin, navigate])

  // Fetch all won items (admin can see all)
  useEffect(() => {
    if (!user || !isAdmin) return

    fetchItems()

    // Real-time updates
    const channel = supabase
      .channel('admin-payments-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'items',
        },
        () => fetchItems()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, isAdmin])

  const fetchItems = async () => {
    try {
      setLoading(true)

      // Admin sees all items from finishes view
      const { data, error } = await supabase
        .from('finishes')
        .select('*')
        .order('finished_at', { ascending: false })

      if (error) throw error
      setItems(data || [])
    } catch (err) {
      console.error('Error fetching items:', err)
      toast.error('Erro ao carregar itens')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (
    itemId: string,
    newStatus: PaymentStatus
  ) => {
    try {
      const { error } = await supabase
        .from('items')
        .update({ payment_status: newStatus })
        .eq('id', itemId)

      if (error) throw error

      toast.success('Status atualizado com sucesso!')
      fetchItems()
    } catch (err) {
      console.error('Error updating status:', err)
      toast.error('Erro ao atualizar status')
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

  const filteredItems = items.filter((item) => {
    if (filter === 'all') return true
    return (item.payment_status || 'pending') === filter
  })

  const stats = {
    total: items.length,
    pending: items.filter((i) => (i.payment_status || 'pending') === 'pending')
      .length,
    paid: items.filter((i) => i.payment_status === 'paid').length,
    delivered: items.filter((i) => i.payment_status === 'delivered').length,
    totalValue: items.reduce((sum, i) => sum + Number(i.final_value || 0), 0),
  }

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
              <Shield className="size-5 text-primary" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold">
                  Gerenciar Pagamentos
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
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4">
            <Card className="p-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total de Itens</p>
                <p className="text-2xl md:text-3xl font-bold">{stats.total}</p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Valor Total</p>
                <p className="text-xl md:text-2xl font-bold text-primary">
                  {formatCurrency(stats.totalValue)}
                </p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Pendentes</p>
                <p className="text-2xl md:text-3xl font-bold text-destructive">
                  {stats.pending}
                </p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Pagos</p>
                <p className="text-2xl md:text-3xl font-bold text-blue-600">
                  {stats.paid}
                </p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Entregues</p>
                <p className="text-2xl md:text-3xl font-bold text-green-600">
                  {stats.delivered}
                </p>
              </div>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge
              variant={filter === 'all' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter('all')}
            >
              Todos ({stats.total})
            </Badge>
            <Badge
              variant={filter === 'pending' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter('pending')}
            >
              Pendentes ({stats.pending})
            </Badge>
            <Badge
              variant={filter === 'paid' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter('paid')}
            >
              Pagos ({stats.paid})
            </Badge>
            <Badge
              variant={filter === 'delivered' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => setFilter('delivered')}
            >
              Entregues ({stats.delivered})
            </Badge>
          </div>

          {/* Items Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="text-left p-3 text-xs font-medium">Item</th>
                    <th className="text-left p-3 text-xs font-medium">
                      Vencedor
                    </th>
                    <th className="text-left p-3 text-xs font-medium">
                      Contato
                    </th>
                    <th className="text-right p-3 text-xs font-medium">
                      Valor
                    </th>
                    <th className="text-left p-3 text-xs font-medium">Data</th>
                    <th className="text-left p-3 text-xs font-medium">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="p-8 text-center text-muted-foreground"
                      >
                        Nenhum item encontrado
                      </td>
                    </tr>
                  ) : (
                    filteredItems.map((item) => (
                      <PaymentRow
                        key={item.item_id}
                        item={item}
                        onStatusChange={handleStatusChange}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </main>
    </div>
  )
}

function PaymentRow({
  item,
  onStatusChange,
}: {
  item: WonItem
  onStatusChange: (itemId: string, status: PaymentStatus) => void
}) {
  const currentStatus = (item.payment_status || 'pending') as PaymentStatus

  const openWhatsApp = () => {
    const phone = item.winner_whatsapp?.replace(/\D/g, '')
    if (!phone) {
      toast.error('WhatsApp não disponível')
      return
    }
    window.open(`https://wa.me/${phone}`, '_blank')
  }

  const sendEmail = () => {
    if (!item.winner_email) {
      toast.error('Email não disponível')
      return
    }
    window.location.href = `mailto:${item.winner_email}?subject=Leilão Liquida AP - ${item.item_title}`
  }

  return (
    <tr className="border-b hover:bg-muted/30 transition-colors">
      <td className="p-3">
        <div className="flex items-center gap-3">
          {item.photos && item.photos.length > 0 && (
            <img
              src={item.photos[0]}
              alt={item.item_title || ''}
              className="size-12 rounded object-cover"
            />
          )}
          <div>
            <p className="font-medium text-sm">
              {item.item_title || 'Sem título'}
            </p>
          </div>
        </div>
      </td>
      <td className="p-3">
        <p className="text-sm font-medium">
          {item.winner_name || 'Desconhecido'}
        </p>
      </td>
      <td className="p-3">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={openWhatsApp}
            className="h-8 w-8 p-0"
            title={`WhatsApp: ${item.winner_whatsapp || 'N/A'}`}
          >
            <MessageCircle className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={sendEmail}
            className="h-8 w-8 p-0"
            title={`Email: ${item.winner_email || 'N/A'}`}
          >
            <Mail className="size-4" />
          </Button>
        </div>
      </td>
      <td className="p-3 text-right">
        <p className="text-sm font-bold text-primary">
          {formatCurrency(Number(item.final_value || 0))}
        </p>
      </td>
      <td className="p-3">
        <p className="text-xs text-muted-foreground">
          {formatDate(item.finished_at)}
        </p>
      </td>
      <td className="p-3">
        <Select
          value={currentStatus}
          onValueChange={(value) =>
            onStatusChange(item.item_id!, value as PaymentStatus)
          }
        >
          <SelectTrigger className="w-[140px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">
              <div className="flex items-center gap-2">
                <Clock className="size-3 text-destructive" />
                <span>Pendente</span>
              </div>
            </SelectItem>
            <SelectItem value="paid">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="size-3 text-blue-600" />
                <span>Pago</span>
              </div>
            </SelectItem>
            <SelectItem value="delivered">
              <div className="flex items-center gap-2">
                <Package className="size-3 text-green-600" />
                <span>Entregue</span>
              </div>
            </SelectItem>
          </SelectContent>
        </Select>
      </td>
    </tr>
  )
}
