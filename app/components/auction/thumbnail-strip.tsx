import { useState } from 'react'
import { cn } from '~/lib/utils'

interface ThumbnailStripProps {
  photos: string[]
  onImageClick?: (index: number) => void
}

export function ThumbnailStrip({ photos, onImageClick }: ThumbnailStripProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (!photos || photos.length === 0) {
    return (
      <div className="w-full h-20 bg-muted rounded-lg flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Sem fotos</p>
      </div>
    )
  }

  const handleClick = (index: number) => {
    setActiveIndex(index)
    onImageClick?.(index)
  }

  return (
    <div className="relative">
      <div className="flex gap-2 overflow-x-auto snap-x snap-mandatory scrollbar-thin scrollbar-thumb-primary/20 pb-2">
        {photos.map((photo, index) => (
          <button
            key={index}
            onClick={() => handleClick(index)}
            className={cn(
              'shrink-0 w-24 h-16 rounded-md overflow-hidden',
              'border-2 transition-all snap-start',
              'hover:border-primary hover:scale-105',
              activeIndex === index
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-transparent'
            )}
          >
            <img
              src={photo}
              alt={`Foto ${index + 1}`}
              className="w-full h-full object-cover"
            />
          </button>
        ))}
      </div>

      {photos.length > 1 && (
        <div className="flex justify-center gap-1 mt-2">
          {photos.map((_, index) => (
            <button
              key={index}
              onClick={() => handleClick(index)}
              className={cn(
                'h-1.5 rounded-full transition-all',
                activeIndex === index ? 'w-4 bg-primary' : 'w-1.5 bg-muted'
              )}
              aria-label={`Ver foto ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
