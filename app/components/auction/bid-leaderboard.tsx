import { AnimatePresence, motion } from 'framer-motion'
import { ArrowUp, Crown } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { cn } from '~/lib/utils'
import type { Tables } from '~/types/database'

type Bid = Tables<'bids'> & {
  users: {
    name: string
  } | null
}

interface BidLeaderboardProps {
  bids: Bid[]
  currentUserId?: string
  limit?: number
  onViewAll?: () => void
  className?: string
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
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

export function BidLeaderboard({
  bids,
  currentUserId,
  limit = 5,
  onViewAll,
  className,
}: BidLeaderboardProps) {
  const displayBids = bids.slice(0, limit)
  const hasMore = bids.length > limit

  if (bids.length === 0) {
    return (
      <Card className={cn('p-4 text-center text-muted-foreground', className)}>
        <p className="text-xs">Nenhum lance ainda. Seja o primeiro!</p>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Lances Recentes
        </h3>
        {hasMore && onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="text-[10px] h-auto py-0.5"
          >
            Ver todos ({bids.length})
          </Button>
        )}
      </div>

      <div className="space-y-1.5">
        <AnimatePresence mode="popLayout">
          {displayBids.map((bid, index) => {
            const isLeader = index === 0
            const isCurrentUser = bid.user_id === currentUserId
            const position = index + 1

            return (
              <motion.div
                key={bid.id}
                layout
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <Card
                  className={cn(
                    'p-2 transition-all',
                    isLeader && 'bg-primary/10 border-primary',
                    isCurrentUser &&
                      !isLeader &&
                      'bg-primary/5 border-primary/30',
                    !isLeader && !isCurrentUser && 'bg-card'
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      {/* Position Badge */}
                      <div
                        className={cn(
                          'size-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0',
                          isLeader && 'bg-chart-1 text-primary-foreground',
                          position === 2 &&
                            'bg-chart-2 text-primary-foreground',
                          position === 3 &&
                            'bg-chart-3 text-primary-foreground',
                          position > 3 && 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isLeader ? (
                          <Crown className="size-3" />
                        ) : (
                          `#${position}`
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-xs truncate">
                            {bid.users?.name?.split(' ')[0] || 'Anônimo'}
                          </p>
                          {isCurrentUser && (
                            <span className="text-[10px] font-medium text-primary">
                              (Você)
                            </span>
                          )}
                          {isLeader && (
                            <span className="text-[10px] font-medium text-primary">
                              Liderando!
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {bid.created_at
                            ? formatRelativeTime(bid.created_at)
                            : ''}
                        </p>
                      </div>
                    </div>

                    {/* Bid Value */}
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-0.5">
                        {isLeader && (
                          <ArrowUp className="size-3 text-primary" />
                        )}
                        <p
                          className={cn(
                            'font-bold',
                            isLeader ? 'text-sm' : 'text-xs'
                          )}
                        >
                          {formatCurrency(bid.value)}
                        </p>
                      </div>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  )
}
