import { Heart } from 'lucide-react'
import { Badge } from '~/components/ui/badge'

interface AuctionStatusBadgeProps {
  status: 'scheduled' | 'live' | 'finished' | string
  isDonation?: boolean
  seconds?: number | null
}

export function AuctionStatusBadge({
  status,
  isDonation,
  seconds,
}: AuctionStatusBadgeProps) {
  const isEndingSoon =
    seconds !== null && seconds !== undefined && seconds > 0 && seconds < 300 // <5min

  return (
    <div className="flex gap-1.5 flex-wrap">
      {status === 'scheduled' && (
        <Badge variant="default" className="text-xs">
          Em Breve
        </Badge>
      )}

      {status === 'live' && (
        <Badge variant="destructive" className="animate-pulse text-xs">
          Ao Vivo
        </Badge>
      )}

      {status === 'finished' && (
        <Badge variant="secondary" className="text-xs">
          Encerrado
        </Badge>
      )}

      {isEndingSoon && status === 'live' && (
        <Badge
          variant="destructive"
          className="animate-pulse text-xs font-bold"
        >
          ENCERRANDO
        </Badge>
      )}

      {isDonation && (
        <Badge variant="outline" className="text-xs">
          <Heart className="size-3 mr-1 fill-current" />
          Doação
        </Badge>
      )}
    </div>
  )
}
