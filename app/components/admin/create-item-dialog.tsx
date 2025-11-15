import { Plus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import { Checkbox } from '~/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Spinner } from '~/components/ui/spinner'
import { Textarea } from '~/components/ui/textarea'
import { supabase } from '~/lib/supabase'
import { ImageUploadPreview } from './image-upload-preview'

type FormData = {
  title: string
  description: string
  starting_bid: string
  bid_step: string
  is_donation: boolean
  status: 'draft' | 'scheduled' | 'active'
  auction_start: string
  auction_end: string
}

export function CreateItemDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [imagePreviews, setImagePreviews] = useState<string[]>([])
  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    starting_bid: '0',
    bid_step: '1',
    is_donation: false,
    status: 'draft',
    auction_start: '',
    auction_end: '',
  })

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      starting_bid: '0',
      bid_step: '1',
      is_donation: false,
      status: 'draft',
      auction_start: '',
      auction_end: '',
    })
    setImageFiles([])
    // Cleanup previews
    imagePreviews.forEach((url) => URL.revokeObjectURL(url))
    setImagePreviews([])
  }

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleImagesChange = (files: File[], previews: string[]) => {
    setImageFiles(files)
    setImagePreviews(previews)
  }

  const uploadImages = async (): Promise<string[]> => {
    const uploadedUrls: string[] = []

    for (const file of imageFiles) {
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}-${file.name}`
      const filePath = `items/${fileName}`

      const { data, error } = await supabase.storage
        .from('item-photos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        throw new Error(`Erro ao fazer upload: ${error.message}`)
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('item-photos').getPublicUrl(data.path)

      uploadedUrls.push(publicUrl)
    }

    return uploadedUrls
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!formData.title.trim()) {
      toast.error('Título é obrigatório')
      return
    }

    if (!formData.description.trim()) {
      toast.error('Descrição é obrigatória')
      return
    }

    if (imageFiles.length === 0) {
      toast.error('Adicione pelo menos uma foto')
      return
    }

    if (formData.status === 'scheduled') {
      if (!formData.auction_start || !formData.auction_end) {
        toast.error('Defina as datas de início e fim para itens agendados')
        return
      }

      if (new Date(formData.auction_start) >= new Date(formData.auction_end)) {
        toast.error('A data de início deve ser anterior à data de fim')
        return
      }
    }

    setLoading(true)
    const loadingToast = toast.loading('Criando item...')

    try {
      // Upload images first
      toast.loading('Fazendo upload das imagens...', { id: loadingToast })
      const photoUrls = await uploadImages()

      // Create item
      toast.loading('Salvando item...', { id: loadingToast })

      // Convert datetime-local (browser timezone) to UTC ISO string
      const convertToUTC = (localDateTimeString: string | null) => {
        if (!localDateTimeString) return null
        // datetime-local gives us a string like "2025-11-15T12:16"
        // We create a Date object which interprets it as local time
        const localDate = new Date(localDateTimeString)
        // toISOString() converts to UTC
        return localDate.toISOString()
      }

      const { error } = await supabase.from('items').insert({
        title: formData.title.trim(),
        description: formData.description.trim(),
        photos: photoUrls,
        starting_bid: parseFloat(formData.starting_bid),
        bid_step: parseFloat(formData.bid_step),
        is_donation: formData.is_donation,
        status: formData.status,
        auction_start:
          formData.status === 'scheduled'
            ? convertToUTC(formData.auction_start)
            : null,
        auction_end:
          formData.status === 'scheduled'
            ? convertToUTC(formData.auction_end)
            : null,
      })

      if (error) throw error

      toast.success('Item criado com sucesso!', { id: loadingToast })
      resetForm()
      setOpen(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro'
      toast.error(message, { id: loadingToast })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <Plus className="size-4 mr-2" />
          Novo Item
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar Novo Item</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => handleChange('title', e.target.value)}
              required
              placeholder="Ex: Sofá 3 lugares"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              required
              rows={3}
              placeholder="Descreva o item em detalhes..."
            />
          </div>

          {/* Photos */}
          <ImageUploadPreview
            images={imageFiles}
            previews={imagePreviews}
            onImagesChange={handleImagesChange}
          />

          {/* Pricing */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="starting_bid">Lance Inicial (R$)</Label>
              <Input
                id="starting_bid"
                type="number"
                min="0"
                step="0.01"
                value={formData.starting_bid}
                onChange={(e) => handleChange('starting_bid', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bid_step">Incremento (R$) *</Label>
              <Input
                id="bid_step"
                type="number"
                min="0.01"
                step="0.01"
                value={formData.bid_step}
                onChange={(e) => handleChange('bid_step', e.target.value)}
                required
              />
            </div>
          </div>

          {/* Donation checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="is_donation"
              checked={formData.is_donation}
              onCheckedChange={(checked) =>
                handleChange('is_donation', checked === true)
              }
            />
            <Label htmlFor="is_donation" className="cursor-pointer">
              Este item é uma doação
            </Label>
          </div>

          {/* Status */}
          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleChange('status', value)}
            >
              <SelectTrigger id="status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Rascunho</SelectItem>
                <SelectItem value="scheduled">Agendado</SelectItem>
                <SelectItem value="active">Ativo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Scheduling */}
          {formData.status === 'scheduled' && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="auction_start">Início do Leilão *</Label>
                <Input
                  id="auction_start"
                  type="datetime-local"
                  value={formData.auction_start}
                  onChange={(e) =>
                    handleChange('auction_start', e.target.value)
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="auction_end">Fim do Leilão *</Label>
                <Input
                  id="auction_end"
                  type="datetime-local"
                  value={formData.auction_end}
                  onChange={(e) => handleChange('auction_end', e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? (
                <>
                  <Spinner className="size-4 mr-2" />
                  Criando...
                </>
              ) : (
                'Criar Item'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
