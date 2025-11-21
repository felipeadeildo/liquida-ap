import { Check, Clock, Gift, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '~/components/ui/button'
import { Card } from '~/components/ui/card'
import { cn } from '~/lib/utils'

interface DonationClaimPanelProps {
  onClaim: () => Promise<void>
  disabled?: boolean
  existingClaim?: {
    status: 'pending' | 'approved' | 'rejected' | 'delivered'
    created_at: string
  } | null
  isAlreadyClaimed?: boolean // By another user
  participantCount?: number // Number of people participating
  className?: string
}

export function DonationClaimPanel({
  onClaim,
  disabled = false,
  existingClaim,
  isAlreadyClaimed = false,
  participantCount = 0,
  className,
}: DonationClaimPanelProps) {
  const [loading, setLoading] = useState(false)

  const handleClaim = async () => {
    if (disabled || loading) return

    setLoading(true)
    try {
      await onClaim()
    } catch (err) {
      // Error handling is done in parent component
    } finally {
      setLoading(false)
    }
  }

  // If another user won the raffle (delivered)
  if (isAlreadyClaimed && !existingClaim) {
    return (
      <Card className={cn('p-4 space-y-3 bg-muted/30', className)}>
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center">
              <X className="size-6 text-muted-foreground" />
            </div>
          </div>
          <div>
            <h3 className="text-base font-semibold">Sorteio Finalizado</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Esta doação já foi sorteada e entregue
            </p>
          </div>
        </div>
      </Card>
    )
  }

  // If user has existing participation
  if (existingClaim) {
    const statusConfig = {
      pending: {
        icon: Clock,
        iconBg: 'bg-yellow-500/10',
        iconColor: 'text-yellow-600',
        title: 'Você está Participando!',
        description:
          'Você entrou na lista. Aguarde o sorteio para saber se foi o vencedor.',
        showParticipants: true,
      },
      approved: {
        icon: Check,
        iconBg: 'bg-green-500/10',
        iconColor: 'text-green-600',
        title: 'Você Ganhou o Sorteio!',
        description:
          'Parabéns! Entre em contato para combinar a retirada do item.',
        showParticipants: false,
      },
      rejected: {
        icon: X,
        iconBg: 'bg-red-500/10',
        iconColor: 'text-red-600',
        title: 'Não Foi Desta Vez',
        description: 'Infelizmente você não foi sorteado desta vez.',
        showParticipants: false,
      },
      delivered: {
        icon: Gift,
        iconBg: 'bg-primary/10',
        iconColor: 'text-primary',
        title: 'Item Entregue',
        description: 'A doação foi entregue com sucesso. Obrigado!',
        showParticipants: false,
      },
    }

    const config = statusConfig[existingClaim.status]
    const Icon = config.icon

    return (
      <Card className={cn('p-4 space-y-3', className)}>
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div
              className={cn(
                'size-12 rounded-full flex items-center justify-center',
                config.iconBg
              )}
            >
              <Icon className={cn('size-6', config.iconColor)} />
            </div>
          </div>
          <div>
            <h3 className="text-base font-semibold">{config.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {config.description}
            </p>
          </div>

          {/* Participant Count */}
          {config.showParticipants && participantCount > 0 && (
            <div className="pt-2 border-t">
              <p className="text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  {participantCount}
                </span>{' '}
                {participantCount === 1
                  ? 'pessoa participando'
                  : 'pessoas participando'}
              </p>
            </div>
          )}

          {/* Email Notification Message */}
          {config.showParticipants && (
            <div className="pt-2 border-t">
              <p className="text-[10px] text-muted-foreground">
                Você receberá uma notificação por e-mail com o resultado do
                sorteio
              </p>
            </div>
          )}
        </div>
      </Card>
    )
  }

  // Default participation form
  return (
    <Card className={cn('p-3 space-y-3', className)}>
      {/* Title */}
      <div className="space-y-0.5">
        <h3 className="text-base font-semibold flex items-center gap-1.5">
          <Gift className="size-4" />
          Participar do Sorteio
        </h3>
        <p className="text-xs text-muted-foreground">
          Este item será sorteado entre os participantes
        </p>
      </div>

      {/* Participant Count */}
      {participantCount > 0 && (
        <div className="text-center py-2 px-3 rounded-md bg-muted/50">
          <p className="text-xs text-muted-foreground">
            <span className="font-semibold text-foreground">
              {participantCount}
            </span>{' '}
            {participantCount === 1
              ? 'pessoa participando'
              : 'pessoas participando'}
          </p>
        </div>
      )}

      {/* Action Button */}
      <Button
        onClick={handleClaim}
        disabled={disabled || loading}
        size="sm"
        className="w-full font-semibold"
      >
        {loading ? 'Entrando...' : 'Entrar no Sorteio'}
      </Button>

      {/* Info Messages */}
      <div className="space-y-1.5">
        <p className="text-[10px] text-center text-muted-foreground">
          Quanto mais cedo você participar, maiores suas chances no sorteio
        </p>
        <p className="text-[10px] text-center text-muted-foreground">
          Você receberá uma notificação por e-mail com o resultado
        </p>
      </div>

      {/* Disabled Message */}
      {disabled && (
        <p className="text-[10px] text-center text-muted-foreground pt-2 border-t">
          Doação não está disponível no momento
        </p>
      )}
    </Card>
  )
}
