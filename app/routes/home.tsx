import { Filter, LogOut, Search, Shield, Sparkles, User, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { AdminOnly } from '~/components/admin-only'
import { CreateItemDialog } from '~/components/admin/create-item-dialog'
import { ItemsList } from '~/components/auction/items-list'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { useAuth } from '~/lib/auth'
import { supabase } from '~/lib/supabase'
import type { Tables } from '~/types/database'
import type { Route } from './+types/home'

type ItemWithStatus = Tables<'items_with_status'>
type StatusFilter = 'all' | 'active' | 'scheduled' | 'finished'
type TypeFilter = 'all' | 'auction' | 'donation'
type SortOrder =
  | 'ending_soon'
  | 'most_popular'
  | 'lowest_price'
  | 'highest_price'
  | 'newest'

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Liquida AP' },
    { name: 'description', content: 'Ap 72 ta acabando... que triste!' },
  ]
}

export default function Home() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const [items, setItems] = useState<ItemWithStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')
  const [sortOrder, setSortOrder] = useState<SortOrder>('ending_soon')

  const handleSignOut = async () => {
    await signOut()
    navigate('/login')
  }

  useEffect(() => {
    fetchItems()

    // Subscribe to item changes
    const channel = supabase
      .channel('items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'items',
        },
        () => fetchItems()
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [searchQuery, statusFilter, typeFilter, sortOrder])

  const fetchItems = async () => {
    try {
      let query = supabase.from('items_with_status').select('*')

      // Don't show finished items by default
      if (statusFilter === 'all') {
        query = query.neq('computed_status', 'finished')
      } else if (statusFilter === 'active') {
        query = query.eq('is_accepting_bids', true)
      } else if (statusFilter === 'scheduled') {
        query = query.eq('computed_status', 'scheduled')
      } else if (statusFilter === 'finished') {
        query = query.eq('computed_status', 'finished')
      }

      // Filter by type
      if (typeFilter === 'donation') {
        query = query.eq('is_donation', true)
      } else if (typeFilter === 'auction') {
        query = query.eq('is_donation', false)
      }

      // Search in title and description
      if (searchQuery.trim()) {
        query = query.or(
          `title.ilike.%${searchQuery}%,description.ilike.%${searchQuery}%`
        )
      }

      const { data, error } = await query

      if (error) throw error

      // Get bid counts for sorting by popularity
      let itemsData = data || []

      if (sortOrder === 'most_popular') {
        // Fetch bid counts for each item
        const { data: bidsData } = await supabase
          .from('bids')
          .select('item_id')
          .eq('is_deleted', false)

        const bidCounts =
          bidsData?.reduce(
            (acc, bid) => {
              acc[bid.item_id] = (acc[bid.item_id] || 0) + 1
              return acc
            },
            {} as Record<string, number>
          ) || {}

        itemsData = itemsData.sort((a, b) => {
          const countA = bidCounts[a.id!] || 0
          const countB = bidCounts[b.id!] || 0
          return countB - countA
        })
      } else {
        // Apply sorting
        itemsData = itemsData.sort((a, b) => {
          switch (sortOrder) {
            case 'ending_soon':
              // Active items first, then by seconds until end (null last)
              if (a.is_accepting_bids && !b.is_accepting_bids) return -1
              if (!a.is_accepting_bids && b.is_accepting_bids) return 1
              if (a.seconds_until_end === null) return 1
              if (b.seconds_until_end === null) return -1
              return Number(a.seconds_until_end) - Number(b.seconds_until_end)

            case 'lowest_price':
              return Number(a.starting_bid || 0) - Number(b.starting_bid || 0)

            case 'highest_price':
              return Number(b.starting_bid || 0) - Number(a.starting_bid || 0)

            case 'newest':
              return (
                new Date(b.created_at!).getTime() -
                new Date(a.created_at!).getTime()
              )

            default:
              return 0
          }
        })
      }

      setItems(itemsData)
    } catch (err) {
      console.error('Error fetching items:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container mx-auto px-4 py-3 md:py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 md:size-6 text-primary" />
            <h1 className="text-xl md:text-2xl font-bold">Liquida AP</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/profile')}
              className="min-h-10"
            >
              <User className="size-4 mr-2" />
              <span className="hidden sm:inline">Perfil</span>
            </Button>
            <AdminOnly>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/admin/payments')}
                className="min-h-10"
              >
                <Shield className="size-4 mr-2" />
                <span className="hidden sm:inline">Pagamentos</span>
              </Button>
              <CreateItemDialog />
            </AdminOnly>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="min-h-10"
            >
              <LogOut className="size-4 mr-2" />
              <span className="hidden sm:inline">Sair</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-6 bg-background">
        <div className="container mx-auto max-w-7xl space-y-4 md:space-y-6">
          {/* Welcome Section */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl md:text-2xl font-bold">
                Olá, {profile?.name?.split(' ')[0] || 'visitante'}!
              </h2>
              <p className="text-xs md:text-sm text-muted-foreground">
                Leilão do AP 72
              </p>
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

          {/* Filters */}
          <div className="space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Buscar itens..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-10"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="size-4" />
                </Button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-2 items-center">
              <Filter className="size-4 text-muted-foreground hidden sm:block" />

              {/* Status Filters */}
              <div className="flex gap-2 flex-wrap">
                <Badge
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setStatusFilter('all')}
                >
                  Ativos
                </Badge>
                <Badge
                  variant={statusFilter === 'active' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setStatusFilter('active')}
                >
                  Ao Vivo
                </Badge>
                <Badge
                  variant={statusFilter === 'scheduled' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setStatusFilter('scheduled')}
                >
                  Em Breve
                </Badge>
                <Badge
                  variant={statusFilter === 'finished' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setStatusFilter('finished')}
                >
                  Encerrados
                </Badge>
              </div>

              <div className="h-4 w-px bg-border hidden sm:block" />

              {/* Type Filters */}
              <div className="flex gap-2 flex-wrap">
                <Badge
                  variant={typeFilter === 'all' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setTypeFilter('all')}
                >
                  Todos
                </Badge>
                <Badge
                  variant={typeFilter === 'auction' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setTypeFilter('auction')}
                >
                  Leilão
                </Badge>
                <Badge
                  variant={typeFilter === 'donation' ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => setTypeFilter('donation')}
                >
                  Doação
                </Badge>
              </div>
            </div>
          </div>

          {/* Items Grid */}
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 md:mb-4">
              <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                <Sparkles className="size-5 md:size-6 text-primary" />
                Itens Disponíveis
              </h2>
              <div className="flex items-center gap-3">
                <p className="text-sm text-muted-foreground">
                  {items.length} {items.length === 1 ? 'item' : 'itens'}
                </p>
                <Select
                  value={sortOrder}
                  onValueChange={(value) => setSortOrder(value as SortOrder)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Ordenar por" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ending_soon">
                      Terminando em breve
                    </SelectItem>
                    <SelectItem value="most_popular">Mais populares</SelectItem>
                    <SelectItem value="lowest_price">Menor preço</SelectItem>
                    <SelectItem value="highest_price">Maior preço</SelectItem>
                    <SelectItem value="newest">Mais recentes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <ItemsList items={items} loading={loading} />
          </div>
        </div>
      </main>
    </div>
  )
}
