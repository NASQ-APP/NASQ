/** رؤوس CORS — تُضاف لكل رد، ولكل دالة طلب OPTIONS مسبق. */
const ALLOWED_ORIGIN = Deno.env.get('APP_ORIGIN') ?? '*'

export const corsHeaders: Record<string, string> = {
  'access-control-allow-origin': ALLOWED_ORIGIN,
  'access-control-allow-headers': 'authorization, x-client-info, apikey, content-type',
  'access-control-allow-methods': 'GET, POST, PATCH, DELETE, OPTIONS',
}

/** يرد على طلب OPTIONS المسبق، أو null لو الطلب ليس كذلك. */
export const handlePreflight = (request: Request): Response | null =>
  request.method === 'OPTIONS' ? new Response('ok', { headers: corsHeaders }) : null
