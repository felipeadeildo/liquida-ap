import { useState } from 'react'
import { cn } from '~/lib/utils'

interface SidebarGalleryProps {
  photos: string[]
  onImageClick?: (index: number) => void
}

export function SidebarGallery({ photos, onImageClick }: SidebarGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0)

  if (!photos || photos.length === 0) {
    return (
      <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center sticky top-20">
        <p className="text-sm text-muted-foreground">Sem fotos</p>
      </div>
    )
  }

  const handleClick = (index: number) => {
    setActiveIndex(index)
    onImageClick?.(index)
  }

  return (
    <div className="sticky top-20 space-y-2">
      {photos.map((photo, index) => (
        <button
          key={index}
          onClick={() => handleClick(index)}
          className={cn(
            'w-full aspect-square rounded-lg overflow-hidden',
            'border-2 transition-all cursor-pointer',
            'hover:border-primary hover:shadow-md',
            activeIndex === index
              ? 'border-primary ring-2 ring-primary/20 shadow-lg'
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
  )
}
