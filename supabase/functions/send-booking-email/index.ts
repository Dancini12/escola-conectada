import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const SHEET_WEBHOOK_URL = Deno.env.get('SHEET_WEBHOOK_URL') ?? ''

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const { email, nome, recurso, data, horario_inicio, horario_fim, quantidade, tipo, token } =
    await req.json()

  const isCancelamento = tipo === 'cancelamento'

  if (SHEET_WEBHOOK_URL && token) {
    try {
      await fetch(SHEET_WEBHOOK_URL, {
        method: 'POST',
        body: JSON.stringify({
          action: isCancelamento ? 'cancelar' : 'criar',
          token,
          nome,
          email,
          recurso,
          data,
          horario_inicio,
          horario_fim,
          quantidade,
        }),
      })
    } catch {
      // ignora falha da planilha para não bloquear o fluxo de agendamento
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
})
