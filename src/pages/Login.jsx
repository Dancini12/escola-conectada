import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { Eye, EyeOff, AlertCircle } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { isSupabaseConfigured } from '../lib/supabase'

export default function Login() {
  const { user, signIn, signUp } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState('login') // 'login' | 'register'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nome, setNome] = useState('')
  const [perfil, setPerfil] = useState('aluno')
  const [turma, setTurma] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  if (user) return <Navigate to="/agendamentos" replace />

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    if (mode === 'login') {
      const { error: err } = await signIn(email, password)
      if (err) {
        setError('E-mail ou senha inválidos. Tente novamente.')
      } else {
        navigate('/agendamentos')
      }
    } else {
      const { error: err } = await signUp(email, password, { nome, perfil, turma })
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
    navigate('/agendamentos')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-500 to-primary-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-2xl font-bold text-primary-500">EC</span>
          </div>
          <h1 className="text-3xl font-bold text-white">Escola Conectada</h1>
          <p className="text-primary-200 mt-1 text-sm">
            Sistema de Agendamento de Recursos Tecnológicos
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
              <>
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Perfil</label>
                  <select
                    value={perfil}
                    onChange={e => setPerfil(e.target.value)}
                    className="input"
                  >
                    <option value="aluno">Aluno</option>
                    <option value="professor">Professor</option>
                    <option value="admin">Administrador</option>
                  </select>
                </div>
                {perfil === 'aluno' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
                    <input
                      type="text"
                      value={turma}
                      onChange={e => setTurma(e.target.value)}
                      placeholder="Ex: 9º A"
                      className="input"
                    />
                  </div>
                )}
              </>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="input"
              />
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

        <p className="text-center text-primary-200 text-xs mt-6">
          Prefeitura Municipal de Educação · Sistema Escolar Digital
        </p>
      </div>
    </div>
  )
}
