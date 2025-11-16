import { Sparkles } from 'lucide-react'
import { Spinner } from '~/components/ui/spinner'
import type { Tables } from '~/types/database'
import { ItemCard } from './item-card'

type ItemWithStatus = Tables<'items_with_status'>

interface ItemsListProps {
  items: ItemWithStatus[]
  loading: boolean
}

export function ItemsList({ items, loading }: ItemsListProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <div className="relative inline-block">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg animate-pulse" />
            <Spinner className="size-8 relative" />
          </div>
          <p className="text-sm text-muted-foreground">Carregando itens...</p>
        </div>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="flex justify-center">
          <div className="bg-muted rounded-full p-4">
            <Sparkles className="size-8 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Nenhum item disponível</h3>
          <p className="text-muted-foreground text-sm">
            Os itens do leilão aparecerão aqui em breve!
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
