import confetti from 'canvas-confetti'
import { Gavel } from 'lucide-react'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { Input } from '~/components/ui/input'
import { cn } from '~/lib/utils'

interface BidControlPanelProps {
  minBid: number
  bidStep: number
  onPlaceBid: (amount: number) => Promise<void>
  disabled?: boolean
  userRank?: number | null // null if not in top, number if in top positions
  isWinning?: boolean
  className?: string
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function BidControlPanel({
  minBid,
  bidStep,
  onPlaceBid,
  disabled = false,
  userRank,
  isWinning = false,
  className,
}: BidControlPanelProps) {
  const [customBid, setCustomBid] = useState('')
  const [loading, setLoading] = useState(false)

  // Calculate quick bid amounts
  const quickBids = [minBid, minBid + bidStep, minBid + bidStep * 2]

  const handleQuickBid = async (amount: number) => {
    if (disabled || loading) return

    setLoading(true)
    try {
      await onPlaceBid(amount)

      // Trigger confetti if this might make them win
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#FFD700', '#FFA500', '#FF6347'],
      })

      // Play success sound (optional)
      try {
        const audio = new Audio('/sounds/bid-success.mp3')
        audio.volume = 0.3
        audio.play().catch(() => {
          // Ignore if sound fails to play
        })
      } catch {
        // Ignore sound errors
      }
    } catch (err) {
      // Error handling is done in parent component
    } finally {
      setLoading(false)
    }
  }

  const handleCustomBid = async () => {
    const amount = Number.parseFloat(customBid)
    if (Number.isNaN(amount) || amount < minBid) return

    await handleQuickBid(amount)
    setCustomBid('')
  }

  return (
    <Card className={cn('p-4 space-y-4', className)}>
      {/* User Status */}
      {userRank !== undefined && userRank !== null && (
        <div
          className={cn(
            'text-center py-2 px-4 rounded-md font-semibold text-sm',
            isWinning
              ? 'bg-green-100 dark:bg-green-950 text-green-700 dark:text-green-300'
              : 'bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-300'
          )}
        >
          {isWinning ? <>Você está vencendo! 🎉</> : <>Você é #{userRank}</>}
        </div>
      )}

      {/* Title */}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Gavel className="size-5" />
          Fazer Lance
        </h3>
        <p className="text-sm text-muted-foreground">
          Valor mínimo: {formatCurrency(minBid)}
        </p>
      </div>

      {/* Quick Bid Buttons */}
      <div className="grid grid-cols-3 gap-2">
        {quickBids.map((amount, index) => (
          <Button
            key={index}
            onClick={() => handleQuickBid(amount)}
            disabled={disabled || loading}
            variant={index === 0 ? 'default' : 'outline'}
            size="lg"
            className={cn(
              'font-bold',
              index === 0 && 'bg-primary text-primary-foreground'
            )}
          >
            {formatCurrency(amount)}
          </Button>
        ))}
      </div>

      {/* Custom Bid Input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Ou digite um valor</label>
        <div className="flex gap-2">
          <Input
            type="number"
            step={bidStep}
            min={minBid}
            value={customBid}
            onChange={(e) => setCustomBid(e.target.value)}
            placeholder={formatCurrency(minBid)}
            disabled={disabled || loading}
            className="flex-1"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && customBid) {
                handleCustomBid()
              }
            }}
          />
          <Button
            onClick={handleCustomBid}
            disabled={!customBid || disabled || loading}
            size="lg"
            className="px-6"
          >
            {loading ? 'Enviando...' : 'Enviar'}
          </Button>
        </div>
      </div>

      {/* Disabled Message */}
      {disabled && (
        <p className="text-xs text-center text-muted-foreground">
          Leilão não está aceitando lances no momento
        </p>
      )}
    </Card>
  )
}
