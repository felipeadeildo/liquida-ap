import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { toast } from 'sonner'
import { Button } from '~/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '~/components/ui/card'
import { Checkbox } from '~/components/ui/checkbox'
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
import { useAuth } from '~/lib/auth'
import { supabase } from '~/lib/supabase'
import type { Route } from './+types/register'

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Cadastro - Liquida AP' },
    { name: 'description', content: 'Crie sua conta' },
  ]
}

export default function Register() {
  const navigate = useNavigate()
  const { user, loading: authLoading } = useAuth()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    whatsapp: '',
    isInsper: false,
    course: '',
    semester: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!authLoading && user) {
      navigate('/', { replace: true })
    }
  }, [user, authLoading, navigate])

  // Show loading while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Spinner className="size-8" />
      </div>
    )
  }

  // If user is logged in, don't render (will redirect)
  if (user) {
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const loadingToast = toast.loading('Criando sua conta...')

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            whatsapp: formData.whatsapp,
            is_insper: formData.isInsper,
            course: formData.isInsper ? formData.course : null,
            semester: formData.isInsper ? formData.semester : null,
          },
        },
      })

      if (signUpError) throw signUpError

      if (data.session) {
        toast.success('Conta criada com sucesso!', { id: loadingToast })
        navigate('/', { replace: true })
      } else {
        toast.info('Verifique seu email para confirmar sua conta', {
          id: loadingToast,
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ocorreu um erro'
      toast.error(message, { id: loadingToast })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-3xl font-bold text-center">
            Crie sua conta
          </CardTitle>
          <CardDescription className="text-center">
            Entre no Liquida AP para começar a dar lances
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome Completo</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                placeholder="João Silva"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                required
                placeholder="voce@exemplo.com"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                type="tel"
                value={formData.whatsapp}
                onChange={(e) => handleChange('whatsapp', e.target.value)}
                required
                placeholder="+55 11 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => handleChange('password', e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
              />
              <p className="text-xs text-muted-foreground">
                No mínimo 6 caracteres
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="isInsper"
                checked={formData.isInsper}
                onCheckedChange={(checked) =>
                  handleChange('isInsper', checked === true)
                }
              />
              <Label htmlFor="isInsper" className="cursor-pointer">
                Sou estudante do Insper
              </Label>
            </div>

            {formData.isInsper && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="course">Curso</Label>
                  <Select
                    value={formData.course}
                    onValueChange={(value) => handleChange('course', value)}
                  >
                    <SelectTrigger id="course">
                      <SelectValue placeholder="Selecione seu curso" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Administração">
                        Administração
                      </SelectItem>
                      <SelectItem value="Ciência da Computação">
                        Ciência da Computação
                      </SelectItem>
                      <SelectItem value="Direito">Direito</SelectItem>
                      <SelectItem value="Economia">Economia</SelectItem>
                      <SelectItem value="Engenharia da Computação">
                        Engenharia da Computação
                      </SelectItem>
                      <SelectItem value="Engenharia Mecânica">
                        Engenharia Mecânica
                      </SelectItem>
                      <SelectItem value="Engenharia Mecatrônica">
                        Engenharia Mecatrônica
                      </SelectItem>
                      <SelectItem value="Insper One">Insper One</SelectItem>
                      <SelectItem value="Outros">Outros</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="semester">Semestre</Label>
                  <Select
                    value={formData.semester}
                    onValueChange={(value) => handleChange('semester', value)}
                  >
                    <SelectTrigger id="semester">
                      <SelectValue placeholder="Selecione seu semestre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1º">1º</SelectItem>
                      <SelectItem value="2º">2º</SelectItem>
                      <SelectItem value="3º">3º</SelectItem>
                      <SelectItem value="4º">4º</SelectItem>
                      <SelectItem value="5º">5º</SelectItem>
                      <SelectItem value="6º">6º</SelectItem>
                      <SelectItem value="7º">7º</SelectItem>
                      <SelectItem value="8º">8º</SelectItem>
                      <SelectItem value="9º">9º</SelectItem>
                      <SelectItem value="10º">10º</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Criando conta...' : 'Cadastrar'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Já tem uma conta?{' '}
            <Link
              to="/login"
              className="text-primary hover:underline font-medium"
            >
              Entrar
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
