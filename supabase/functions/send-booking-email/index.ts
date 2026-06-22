import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') ?? 'noreply@escola.pr.gov.br'

const DIAS   = ['dom.', 'seg.', 'ter.', 'qua.', 'qui.', 'sex.', 'sáb.']
const MESES  = ['jan.', 'fev.', 'mar.', 'abr.', 'mai.', 'jun.',
                'jul.', 'ago.', 'set.', 'out.', 'nov.', 'dez.']

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

  const { email, nome, recurso, data, horario_inicio, horario_fim, quantidade, cancel_url } =
    await req.json()

  // Parse date in BRT (UTC-3) — avoids DST issues
  const [ano, mes, dia] = data.split('-').map(Number)
  const date = new Date(Date.UTC(ano, mes - 1, dia, 12, 0, 0))

  const diaSemana = DIAS[date.getUTCDay()]
  const mesLabel  = MESES[date.getUTCMonth()]
  const qtdLabel  = `${quantidade} unidade${quantidade !== 1 ? 's' : ''}`

  const subject =
    `Compromisso agendado: ${recurso} (${nome}) — ${diaSemana} ${dia} ${mesLabel} ${ano} ${horario_inicio} – ${horario_fim} (BRT)`

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:10px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08);">

        <!-- Header -->
        <tr>
          <td style="background:#1a73e8;padding:28px 36px;">
            <p style="margin:0;color:rgba(255,255,255,.8);font-size:13px;letter-spacing:.5px;text-transform:uppercase;">Escola Conectada</p>
            <h1 style="margin:6px 0 0;color:#fff;font-size:22px;font-weight:700;">Compromisso agendado</h1>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px 36px;">
            <h2 style="margin:0 0 4px;font-size:20px;color:#1a73e8;">${recurso} (${nome})</h2>
            <p style="margin:0 0 28px;font-size:13px;color:#888;">${email} — Organizador</p>

            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:10px 0;width:36px;vertical-align:top;font-size:18px;">📅</td>
                <td style="padding:10px 0;width:110px;color:#666;font-size:14px;vertical-align:top;">Data</td>
                <td style="padding:10px 0;font-size:14px;font-weight:700;color:#222;vertical-align:top;">${diaSemana} ${dia} ${mesLabel} ${ano}</td>
              </tr>
              <tr style="border-top:1px solid #f0f0f0;">
                <td style="padding:10px 0;font-size:18px;">⏰</td>
                <td style="padding:10px 0;color:#666;font-size:14px;">Horário</td>
                <td style="padding:10px 0;font-size:14px;font-weight:700;color:#222;">das ${horario_inicio} às ${horario_fim} (BRT)</td>
              </tr>
              <tr style="border-top:1px solid #f0f0f0;">
                <td style="padding:10px 0;font-size:18px;">💻</td>
                <td style="padding:10px 0;color:#666;font-size:14px;">Recurso</td>
                <td style="padding:10px 0;font-size:14px;font-weight:700;color:#222;">${recurso}</td>
              </tr>
              <tr style="border-top:1px solid #f0f0f0;">
                <td style="padding:10px 0;font-size:18px;">🔢</td>
                <td style="padding:10px 0;color:#666;font-size:14px;">Quantidade</td>
                <td style="padding:10px 0;font-size:14px;font-weight:700;color:#222;">${qtdLabel}</td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Cancel CTA -->
        ${cancel_url ? `
        <tr>
          <td style="padding:0 36px 28px;">
            <a href="${cancel_url}"
              style="display:block;text-align:center;padding:12px;border-radius:10px;border:2px solid #e53e3e;color:#e53e3e;font-size:14px;font-weight:600;text-decoration:none;">
              Cancelar este agendamento
            </a>
          </td>
        </tr>` : ''}

        <!-- Footer -->
        <tr>
          <td style="padding:20px 36px;background:#f9f9f9;border-top:1px solid #eee;">
            <p style="margin:0;font-size:12px;color:#aaa;">
              Este é um e-mail automático gerado pelo sistema Escola Conectada. Não responda a esta mensagem.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({ from: `Escola Conectada <${FROM_EMAIL}>`, to: [email], subject, html }),
  })

  const body = await res.json()

  return new Response(JSON.stringify(body), {
    status: res.ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
  })
})
