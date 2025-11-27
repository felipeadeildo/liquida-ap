import {
  ArrowLeft,
  Eye,
  Gift,
  Hammer,
  Mail,
  MessageCircle,
  Search,
  Shield,
  Users as UsersIcon,
  X,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { Spinner } from '~/components/ui/spinner'
import { useAuth } from '~/lib/auth'
import { formatDate } from '~/lib/format'
import { supabase } from '~/lib/supabase'
import type { Tables } from '~/types/database'
import type { Route } from './+types/users'

type UserWithStats = Tables<'users'> & {
  bid_count: number
  won_items_count: number
  won_auction_count: number
  won_donation_count: number
  total_spent: number
}

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Usuários - Admin' },
    { name: 'description', content: 'Gerencie usuários da plataforma' },
  ]
}

export default function AdminUsers() {
  const { user, isAdmin, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [users, setUsers] = useState<UserWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      navigate('/')
    }
  }, [authLoading, user, isAdmin, navigate])

  // Fetch users
  useEffect(() => {
    if (!user || !isAdmin) return
    fetchUsers()
  }, [user, isAdmin])

  const fetchUsers = async () => {
    try {
      setLoading(true)

      // Get all users
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })

      if (usersError) throw usersError

      // For each user, get stats
      const usersWithStats = await Promise.all(
        (usersData || []).map(async (u) => {
          // Count bids
          const { count: bidCount } = await supabase
            .from('bids')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', u.id)
            .eq('is_deleted', false)

          // Count won items (auction)
          const { count: wonAuctionCount } = await supabase
            .from('finishes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', u.id)

          // Count won donations
          const { count: wonDonationCount } = await supabase
            .from('donation_claims')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', u.id)
            .in('status', ['approved', 'delivered'])

          // Calculate total spent
          const { data: wonItems } = await supabase
            .from('finishes')
            .select('final_value')
            .eq('user_id', u.id)

          const totalSpent = (wonItems || []).reduce(
            (sum, item) => sum + Number(item.final_value || 0),
            0
          )

          return {
            ...u,
            bid_count: bidCount || 0,
            won_items_count: (wonAuctionCount || 0) + (wonDonationCount || 0),
            won_auction_count: wonAuctionCount || 0,
            won_donation_count: wonDonationCount || 0,
            total_spent: totalSpent,
          }
        })
      )

      setUsers(usersWithStats)
    } catch (err) {
      console.error('Error fetching users:', err)
    } finally {
      setLoading(false)
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

  // Filter users by search query
  const filteredUsers = users.filter((u) => {
    const query = searchQuery.toLowerCase()
    return (
      u.name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.whatsapp?.includes(query) ||
      u.course?.toLowerCase().includes(query)
    )
  })

  const insperUsers = filteredUsers.filter((u) => u.is_insper)
  const adminUsers = filteredUsers.filter((u) => u.role === 'admin')
  const totalBids = filteredUsers.reduce((sum, u) => sum + u.bid_count, 0)
  const totalRevenue = filteredUsers.reduce((sum, u) => sum + u.total_spent, 0)

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
              <UsersIcon className="size-5 text-primary" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold">
                  Gerenciar Usuários
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
                <p className="text-xs text-muted-foreground">Total Usuários</p>
                <p className="text-2xl md:text-3xl font-bold">
                  {filteredUsers.length}
                </p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Insper</p>
                <p className="text-2xl md:text-3xl font-bold text-primary">
                  {insperUsers.length}
                </p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Total Lances</p>
                <p className="text-2xl md:text-3xl font-bold text-blue-600">
                  {totalBids}
                </p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Receita Total</p>
                <p className="text-2xl md:text-3xl font-bold text-green-600">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                    minimumFractionDigits: 0,
                  }).format(totalRevenue)}
                </p>
              </div>
            </Card>
            <Card className="p-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Admins</p>
                <p className="text-2xl md:text-3xl font-bold text-orange-600">
                  {adminUsers.length}
                </p>
              </div>
            </Card>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, email, WhatsApp ou curso..."
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

          {/* Users Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="text-left p-3 text-xs font-semibold">
                      Usuário
                    </th>
                    <th className="text-left p-3 text-xs font-semibold hidden md:table-cell">
                      Contato
                    </th>
                    <th className="text-left p-3 text-xs font-semibold hidden lg:table-cell">
                      Curso
                    </th>
                    <th className="text-center p-3 text-xs font-semibold">
                      Lances
                    </th>
                    <th className="text-center p-3 text-xs font-semibold hidden sm:table-cell">
                      Ganhos
                    </th>
                    <th className="text-left p-3 text-xs font-semibold hidden xl:table-cell">
                      Cadastro
                    </th>
                    <th className="text-right p-3 text-xs font-semibold">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <UserRow key={u.id} user={u} />
                  ))}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <UsersIcon className="size-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhum usuário encontrado
                </p>
              </div>
            )}
          </Card>
        </div>
      </main>
    </div>
  )
}

function UserRow({ user }: { user: UserWithStats }) {
  const navigate = useNavigate()

  const openWhatsApp = () => {
    const whatsappNumber = user.whatsapp?.replace(/\D/g, '') || ''
    if (!whatsappNumber) return
    window.open(`https://wa.me/${whatsappNumber}`, '_blank')
  }

  const sendEmail = () => {
    if (!user.email) return
    window.open(`mailto:${user.email}`, '_blank')
  }

  const viewProfile = () => {
    navigate(`/profile?user=${user.id}`)
  }

  return (
    <tr className="border-b hover:bg-muted/30 transition-colors">
      <td className="p-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-sm">{user.name}</p>
            {user.role === 'admin' && (
              <Badge variant="default" className="text-xs">
                <Shield className="size-3 mr-1" />
                Admin
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{user.email}</p>
          <div className="flex gap-1 flex-wrap">
            {user.is_insper && (
              <Badge variant="secondary" className="text-xs">
                Insper
              </Badge>
            )}
            {user.won_auction_count > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Hammer className="size-3" />
                {user.won_auction_count} leilão
                {user.won_auction_count > 1 ? 'ões' : ''}
              </Badge>
            )}
            {user.won_donation_count > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Gift className="size-3" />
                {user.won_donation_count} doaç
                {user.won_donation_count > 1 ? 'ões' : 'ão'}
              </Badge>
            )}
          </div>
        </div>
      </td>
      <td className="p-3 hidden md:table-cell">
        <p className="text-sm">{user.whatsapp || '-'}</p>
      </td>
      <td className="p-3 hidden lg:table-cell">
        <div className="space-y-0.5">
          <p className="text-sm">{user.course || '-'}</p>
          {user.semester && (
            <p className="text-xs text-muted-foreground">{user.semester}</p>
          )}
        </div>
      </td>
      <td className="p-3 text-center">
        <Badge variant="outline">{user.bid_count}</Badge>
      </td>
      <td className="p-3 text-center hidden sm:table-cell">
        <Badge variant="outline">{user.won_items_count}</Badge>
      </td>
      <td className="p-3 hidden xl:table-cell">
        <p className="text-xs text-muted-foreground">
          {formatDate(user.created_at)}
        </p>
      </td>
      <td className="p-3">
        <div className="flex justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={viewProfile}
            className="h-8 w-8 p-0"
            title="Ver Perfil"
          >
            <Eye className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={sendEmail}
            disabled={!user.email}
            className="h-8 w-8 p-0"
            title="Enviar Email"
          >
            <Mail className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={openWhatsApp}
            disabled={!user.whatsapp}
            className="h-8 w-8 p-0"
            title="Abrir WhatsApp"
          >
            <MessageCircle className="size-4" />
          </Button>
        </div>
      </td>
    </tr>
  )
}
