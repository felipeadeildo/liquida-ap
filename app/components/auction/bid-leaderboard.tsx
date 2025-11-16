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
      <Card className={cn('p-6 text-center text-muted-foreground', className)}>
        <p className="text-sm">Nenhum lance ainda. Seja o primeiro!</p>
      </Card>
    )
  }

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
          Lances Recentes
        </h3>
        {hasMore && onViewAll && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onViewAll}
            className="text-xs h-auto py-1"
          >
            Ver todos ({bids.length})
          </Button>
        )}
      </div>

      <div className="space-y-2">
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
                    'p-3 transition-all',
                    isLeader &&
                      'bg-linear-to-br from-yellow-50 to-yellow-100 dark:from-yellow-950/20 dark:to-yellow-900/20 border-yellow-300 dark:border-yellow-700',
                    isCurrentUser &&
                      !isLeader &&
                      'bg-primary/5 border-primary/30',
                    !isLeader && !isCurrentUser && 'bg-card'
                  )}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Position Badge */}
                      <div
                        className={cn(
                          'size-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0',
                          isLeader
                            ? 'bg-yellow-500 text-white'
                            : position === 2
                              ? 'bg-gray-400 text-white'
                              : position === 3
                                ? 'bg-orange-600 text-white'
                                : 'bg-muted text-muted-foreground'
                        )}
                      >
                        {isLeader ? (
                          <Crown className="size-4" />
                        ) : (
                          `#${position}`
                        )}
                      </div>

                      {/* User Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-sm truncate">
                            {bid.users?.name?.split(' ')[0] || 'Anônimo'}
                          </p>
                          {isCurrentUser && (
                            <span className="text-xs font-medium text-primary">
                              (Você)
                            </span>
                          )}
                          {isLeader && (
                            <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">
                              Liderando!
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {bid.created_at
                            ? formatRelativeTime(bid.created_at)
                            : ''}
                        </p>
                      </div>
                    </div>

                    {/* Bid Value */}
                    <div className="text-right shrink-0">
                      <div className="flex items-center gap-1">
                        {isLeader && (
                          <ArrowUp className="size-3.5 text-green-600 dark:text-green-400" />
                        )}
                        <p
                          className={cn(
                            'font-bold',
                            isLeader ? 'text-base' : 'text-sm'
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
