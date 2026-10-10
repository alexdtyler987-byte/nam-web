import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Sesión inválida' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json()
    const { nombre, dni, password, peso, altura, pesoIdeal, historial, diagnostico, plan, imc } = body

    if (!nombre || !/^\d{8}$/.test(dni)) {
      return new Response(JSON.stringify({ error: 'Nombre y DNI (8 dígitos) son obligatorios.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!password || password.length < 6) {
      return new Response(JSON.stringify({ error: 'La contraseña debe tener al menos 6 caracteres.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const correoSintetico = `${dni}@pacientes.nam.app`

    const { data: nuevoUsuario, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email: correoSintetico,
      password,
      email_confirm: true,
      user_metadata: { role: 'paciente', nombre, dni },
    })

    if (createUserError) {
      return new Response(JSON.stringify({ error: createUserError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: pacienteCreado, error: insertError } = await supabaseAdmin
  .from('PACIENTES')
  .insert({
    Nombre: nombre,
    DNI: dni,
    'Peso actual': peso || null,
    Altura: altura || null,
    'Peso ideal': pesoIdeal || null,
    Historial: historial || null,
    Diagnostico: diagnostico || null,
    'Plan recomendado': plan || null,
    IMC: imc || null,
    nutricionista_id: user.id,
    user_id: nuevoUsuario.user.id,
  })
  .select()

    if (insertError) {
      await supabaseAdmin.auth.admin.deleteUser(nuevoUsuario.user.id)
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ paciente: pacienteCreado[0] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})