import { Upload, X } from 'lucide-react'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'

interface ImageUploadPreviewProps {
  images: File[]
  previews: string[]
  onImagesChange: (files: File[], previews: string[]) => void
}

export function ImageUploadPreview({
  images,
  previews,
  onImagesChange,
}: ImageUploadPreviewProps) {
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])

    // Validate file types
    const validFiles = files.filter((file) =>
      ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type)
    )

    // Validate file sizes (5MB each)
    const validSizes = validFiles.filter((file) => file.size <= 5 * 1024 * 1024)

    // Add to existing files
    const newFiles = [...images, ...validSizes]

    // Generate previews
    const newPreviews = validSizes.map((file) => URL.createObjectURL(file))
    const allPreviews = [...previews, ...newPreviews]

    onImagesChange(newFiles, allPreviews)

    // Reset input
    e.target.value = ''
  }

  const removeImage = (index: number) => {
    // Revoke URL to free memory
    URL.revokeObjectURL(previews[index])

    const newFiles = images.filter((_, i) => i !== index)
    const newPreviews = previews.filter((_, i) => i !== index)

    onImagesChange(newFiles, newPreviews)
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="photos">Fotos *</Label>
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Input
            id="photos"
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            multiple
            onChange={handleImageChange}
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            onClick={() => document.getElementById('photos')?.click()}
          >
            <Upload className="size-4 mr-2" />
            Adicionar Fotos
          </Button>
          <span className="text-sm text-muted-foreground">
            {images.length} foto(s) selecionada(s)
          </span>
        </div>

        {previews.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {previews.map((preview, index) => (
              <div key={index} className="relative group">
                <img
                  src={preview}
                  alt={`Preview ${index + 1}`}
                  className="w-full h-32 object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="size-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
