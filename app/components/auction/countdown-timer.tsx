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

  // Determine color based on urgency
  const getColorClass = () => {
    if (isStartCountdown) return 'text-blue-600 dark:text-blue-400'

    if (seconds < 30) return 'text-red-600 dark:text-red-400 animate-pulse'
    if (seconds < 600) return 'text-red-600 dark:text-red-400' // <10 min
    if (seconds < 3600) return 'text-yellow-600 dark:text-yellow-400' // <1 hour
    return 'text-green-600 dark:text-green-400'
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
