import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { isSupabaseConfigured } from '../lib/supabase'
import { isSchoolEmail, SCHOOL_EMAIL_DOMAIN } from '../lib/emailValidation'
import logoEscola from '../assets/logo-escola.jpeg'

export default function Login() {
  const { user, signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (user) return <Navigate to="/reservar" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!isSchoolEmail(email)) {
      setError(`Use seu e-mail institucional (${SCHOOL_EMAIL_DOMAIN}).`)
      return
    }

    setLoading(true)

    if (mode === 'login') {
      const { error: err } = await signIn(email, password)
      if (err) {
        setError('E-mail ou senha inválidos. Tente novamente.')
      } else {
        navigate('/reservar')
      }
    } else {
      const { error: err } = await signUp(email, password, { nome, perfil: 'professor' })
      if (err) {
        setError(err.message)
      } else {
        setSuccess('Conta criada! Verifique seu e-mail para confirmar o cadastro.')
        setMode('login')
      }
    }

    setLoading(false)
  }

  function handleDemoLogin() {
    navigate('/reservar')
  }

  return (
    <div className="relative min-h-screen bg-gray-50 flex items-center justify-center p-4 overflow-hidden">
      <img
        src={logoEscola}
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140vmin] h-[140vmin] object-contain opacity-10"
      />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Escola Conectada</h1>
          <p className="text-gray-500 mt-1 text-sm">
            E.E. Padre Manuel da Nóbrega — Agendamento de Chromebooks
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          {/* Tabs */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => { setMode('login'); setError('') }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all
                ${mode === 'login' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
            >
              Entrar
            </button>
            <button
              onClick={() => { setMode('register'); setError('') }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-all
                ${mode === 'register' ? 'bg-white text-primary-600 shadow-sm' : 'text-gray-500'}`}
            >
              Cadastrar
            </button>
          </div>

          {/* Alert */}
          {error && (
            <div className="flex items-center gap-2 bg-red-50 text-red-600 rounded-xl px-4 py-3 mb-4 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 bg-green-50 text-green-600 rounded-xl px-4 py-3 mb-4 text-sm">
              ✓ {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome completo</label>
                <input
                  type="text"
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Seu nome completo"
                  required
                  className="input"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu.nome@escola.pr.gov.br"
                required
                className="input"
              />
              <p className="text-xs text-gray-400 mt-1">
                Precisa terminar em {SCHOOL_EMAIL_DOMAIN}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="input pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3 text-base mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Aguarde...
                </span>
              ) : mode === 'login' ? 'Entrar' : 'Criar conta'}
            </button>
          </form>

          {!isSupabaseConfigured() && (
            <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-200">
              <p className="text-xs text-amber-700 text-center mb-2">
                ⚡ Modo Demo — Supabase não configurado
              </p>
              <button
                onClick={handleDemoLogin}
                className="w-full py-2 text-xs font-medium text-primary-600 border border-primary-300 rounded-lg hover:bg-primary-50 transition-colors"
              >
                Entrar como Admin (Demo)
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
