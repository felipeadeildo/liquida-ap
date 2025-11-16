import { Clock } from 'lucide-react'
import { cn } from '~/lib/utils'

interface CountdownTimerProps {
  seconds: number | null
  isStartCountdown?: boolean
  className?: string
}

function formatTimeRemaining(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m ${secs}s`
  if (minutes > 0) return `${minutes}m ${secs}s`
  return `${secs}s`
}

export function CountdownTimer({
  seconds,
  isStartCountdown = false,
  className,
}: CountdownTimerProps) {
  if (seconds === null || seconds <= 0) return null

  // Determine color based on urgency using theme colors
  const getColorClass = () => {
    if (isStartCountdown) return 'text-primary'

    if (seconds < 30) return 'text-destructive animate-pulse' // <30s critical
    if (seconds < 600) return 'text-chart-2' // <10 min alert
    if (seconds < 3600) return 'text-chart-3' // <1 hour warning
    return 'text-muted-foreground' // >1 hour calm
  }

  const label = isStartCountdown ? 'Começa em' : 'Termina em'

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <Clock className={cn('size-4', getColorClass())} />
      <span className={cn('text-sm font-semibold', getColorClass())}>
        {label} {formatTimeRemaining(seconds)}
      </span>
    </div>
  )
}
