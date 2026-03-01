import { createRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useState } from 'react'
import { AlertCircle } from 'lucide-react'
import { useAuth } from '../auth/use-auth'
import { Button } from '../components/ui/Button'
import { supabase } from '../auth/supabase'
import { Route as rootRoute } from './__root'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession()
    if (data.session) {
      throw redirect({ to: '/' })
    }
  },
  component: LoginPage,
})

const loginSchema = z.object({
  email: z.string().email('Adresse email invalide'),
  password: z.string().min(1, 'Mot de passe requis'),
})

type LoginForm = z.infer<typeof loginSchema>

function LoginPage() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setServerError(null)
    const result = await signIn(data.email, data.password)
    if (result.error) {
      setServerError(result.error)
    } else {
      await navigate({ to: '/' })
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8 gap-3">
          <div className="w-16 h-16 bg-green-700 rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white font-extrabold text-2xl" aria-hidden="true">BB</span>
          </div>
          <div className="text-center">
            <h1 className="text-2xl font-extrabold text-green-900">BienBon.mu</h1>
            <p className="text-sm text-neutral-600 font-semibold mt-1">Administration</p>
          </div>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-xl shadow-md border border-neutral-200 p-8">
          <h2 className="text-lg font-bold text-neutral-900 mb-6">Connexion</h2>

          {serverError ? (
            <div
              role="alert"
              className="flex items-center gap-2 p-3 mb-4 bg-red-100 border border-red-200 rounded-lg"
            >
              <AlertCircle className="w-4 h-4 text-red-700 flex-shrink-0" aria-hidden="true" />
              <p className="text-sm text-red-700 font-semibold">{serverError}</p>
            </div>
          ) : null}

          <form
            onSubmit={(e) => { void handleSubmit(onSubmit)(e) }}
            noValidate
            className="flex flex-col gap-4"
          >
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-semibold text-neutral-900 mb-1.5"
              >
                Adresse email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                aria-describedby={errors.email ? 'email-error' : undefined}
                aria-invalid={errors.email ? 'true' : 'false'}
                className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white text-neutral-900
                  placeholder:text-neutral-400
                  focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                  aria-[invalid=true]:border-red-700"
                placeholder="admin@bienbon.mu"
                {...register('email')}
              />
              {errors.email ? (
                <p id="email-error" role="alert" className="mt-1 text-xs text-red-700">
                  {errors.email.message}
                </p>
              ) : null}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-semibold text-neutral-900 mb-1.5"
              >
                Mot de passe
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                aria-describedby={errors.password ? 'password-error' : undefined}
                aria-invalid={errors.password ? 'true' : 'false'}
                className="w-full px-3 py-2.5 text-sm border border-neutral-200 rounded-lg bg-white text-neutral-900
                  placeholder:text-neutral-400
                  focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent
                  aria-[invalid=true]:border-red-700"
                placeholder="********"
                {...register('password')}
              />
              {errors.password ? (
                <p id="password-error" role="alert" className="mt-1 text-xs text-red-700">
                  {errors.password.message}
                </p>
              ) : null}
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={isSubmitting}
              className="w-full mt-2"
            >
              Se connecter
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-neutral-400 mt-6">
          Acces reserve aux administrateurs BienBon.mu
        </p>
      </div>
    </div>
  )
}
