import { Eye } from 'lucide-react'
import { useEffect, useState } from 'react'
import { supabase } from '~/lib/supabase'
import { cn } from '~/lib/utils'

interface PresenceIndicatorProps {
  itemId: string
  className?: string
}

export function PresenceIndicator({
  itemId,
  className,
}: PresenceIndicatorProps) {
  const [viewerCount, setViewerCount] = useState(0)

  useEffect(() => {
    const channel = supabase.channel(`presence:item-${itemId}`, {
      config: {
        presence: {
          key: crypto.randomUUID(),
        },
      },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const count = Object.keys(state).length
        setViewerCount(count)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [itemId])

  if (viewerCount === 0) return null

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs text-muted-foreground',
        className
      )}
    >
      <div className="relative flex items-center">
        <Eye className="size-3.5" />
        <span className="absolute -top-0.5 -right-0.5 size-1.5 bg-destructive rounded-full animate-pulse" />
      </div>
      <span className="font-medium">
        {viewerCount} {viewerCount === 1 ? 'pessoa' : 'pessoas'} assistindo
      </span>
    </div>
  )
}
