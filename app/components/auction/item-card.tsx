import { Clock, Heart } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Badge } from '~/components/ui/badge'
import { Card } from '~/components/ui/card'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '~/components/ui/carousel'
import { supabase } from '~/lib/supabase'
import type { Tables } from '~/types/database'

type ItemWithStatus = Tables<'items_with_status'>

interface ItemCardProps {
  item: ItemWithStatus
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

function formatTimeRemaining(seconds: number | null): string {
  if (!seconds || seconds <= 0) return ''

  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function ItemCard({ item }: ItemCardProps) {
  const [currentBid, setCurrentBid] = useState<number>(item.starting_bid || 0)
  const isDonation = item.is_donation || false

  useEffect(() => {
    if (!item.id) return

    const itemId = item.id

    // Fetch latest bid
    const fetchLatestBid = async () => {
      const { data } = await supabase
        .from('bids')
        .select('value')
        .eq('item_id', itemId)
        .eq('is_deleted', false)
        .order('value', { ascending: false })
        .limit(1)

      if (data && data.length > 0) {
        setCurrentBid(data[0].value)
      } else {
        setCurrentBid(item.starting_bid || 0)
      }
    }

    fetchLatestBid()

    // Subscribe to new bids
    const channel = supabase
      .channel(`item-bids:${itemId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'bids',
          filter: `item_id=eq.${itemId}`,
        },
        (payload: any) => {
          if (payload.new?.value && !payload.new?.is_deleted) {
            setCurrentBid(payload.new.value)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [item.id, item.starting_bid])

  return (
    <Link to={`/item/${item.id}`}>
      <Card className="overflow-hidden hover:shadow-lg transition-all hover:-translate-y-1 cursor-pointer group">
        {/* Image Carousel */}
        <div className="relative">
          <Carousel className="w-full">
            <CarouselContent>
              {item.photos && item.photos.length > 0 ? (
                item.photos.map((photo, index) => (
                  <CarouselItem key={index}>
                    <div className="relative aspect-square">
                      <img
                        src={photo}
                        alt={`${item.title} - ${index + 1}`}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  </CarouselItem>
                ))
              ) : (
                <CarouselItem>
                  <div className="relative aspect-square bg-muted" />
                </CarouselItem>
              )}
            </CarouselContent>
            {item.photos && item.photos.length > 1 && (
              <div onClick={(e) => e.preventDefault()}>
                <CarouselPrevious className="left-2" />
                <CarouselNext className="right-2" />
              </div>
            )}
          </Carousel>

          {/* Status Badge */}
          {item.computed_status === 'scheduled' && (
            <div className="absolute top-2 left-2">
              <Badge variant="default" className="text-xs">
                Em Breve
              </Badge>
            </div>
          )}

          {item.is_accepting_bids && (
            <div className="absolute top-2 left-2">
              <Badge variant="destructive" className="text-xs animate-pulse">
                Ao Vivo
              </Badge>
            </div>
          )}

          {item.computed_status === 'finished' && (
            <div className="absolute top-2 left-2">
              <Badge variant="secondary" className="text-xs">
                Encerrado
              </Badge>
            </div>
          )}

          {/* Donation Badge */}
          {isDonation && (
            <div className="absolute top-2 right-2">
              <Badge
                variant="outline"
                className="text-xs bg-background/80 backdrop-blur"
              >
                <Heart className="size-3 mr-1 fill-current" />
                Doação
              </Badge>
            </div>
          )}

          {/* Timer Overlay */}
          {item.is_accepting_bids && item.seconds_until_end && (
            <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-1">
              <Clock className="size-3 text-white" />
              <span className="text-xs text-white font-medium">
                {formatTimeRemaining(item.seconds_until_end)}
              </span>
            </div>
          )}

          {item.computed_status === 'scheduled' && item.seconds_until_start && (
            <div className="absolute bottom-2 left-2 right-2 bg-black/60 backdrop-blur-sm rounded px-2 py-1 flex items-center gap-1">
              <Clock className="size-3 text-white" />
              <span className="text-xs text-white font-medium">
                {formatTimeRemaining(item.seconds_until_start)}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-3 space-y-2">
          <h3 className="font-semibold line-clamp-1 group-hover:text-primary transition-colors">
            {item.title}
          </h3>

          {!isDonation && (
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-muted-foreground">Lance atual</span>
              <span className="text-lg font-bold text-primary">
                {formatCurrency(currentBid)}
              </span>
            </div>
          )}
        </div>
      </Card>
    </Link>
  )
}
