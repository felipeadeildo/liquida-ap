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
import { Spinner } from '~/components/ui/spinner'
import { useAuth } from '~/lib/auth'
import { supabase } from '~/lib/supabase'
import type { Route } from './+types/register'

export function meta({}: Route.MetaArgs) {
  return [
    { title: 'Register - Liquida AP' },
    { name: 'description', content: 'Create your account' },
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

    const loadingToast = toast.loading('Creating your account...')

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
        toast.success('Account created successfully!', { id: loadingToast })
        navigate('/', { replace: true })
      } else {
        toast.info('Check your email to confirm your account', {
          id: loadingToast,
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
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
            Create your account
          </CardTitle>
          <CardDescription className="text-center">
            Join Liquida AP to start bidding
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                required
                placeholder="John Doe"
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
                placeholder="you@example.com"
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
              <Label htmlFor="password">Password</Label>
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
                At least 6 characters
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
                I'm an Insper student
              </Label>
            </div>

            {formData.isInsper && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="course">Course</Label>
                  <Input
                    id="course"
                    type="text"
                    value={formData.course}
                    onChange={(e) => handleChange('course', e.target.value)}
                    placeholder="Engineering, Business, etc."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="semester">Semester</Label>
                  <Input
                    id="semester"
                    type="text"
                    value={formData.semester}
                    onChange={(e) => handleChange('semester', e.target.value)}
                    placeholder="1st, 2nd, 3rd..."
                  />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Sign up'}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-4">
            Already have an account?{' '}
            <Link
              to="/login"
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
