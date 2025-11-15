import { Sparkles } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Spinner } from '~/components/ui/spinner'
import { supabase } from '~/lib/supabase'
import type { Tables } from '~/types/database'
import { ItemCard } from './item-card'

type ItemWithStatus = Tables<'items_with_status'>

export function ItemsList() {
  const [items, setItems] = useState<ItemWithStatus[]>([])
  const [loading, setLoading] = useState(true)

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
  }, [])

  const fetchItems = async () => {
    try {
      // Query the view with status computed dynamically
      const { data, error } = await supabase
        .from('items_with_status')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setItems(data || [])
    } catch (err) {
      console.error('Error fetching items:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Spinner className="size-8" />
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
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {items.map((item) => (
        <ItemCard key={item.id} item={item} />
      ))}
    </div>
  )
}
