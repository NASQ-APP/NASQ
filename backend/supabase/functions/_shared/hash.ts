/**
 * بصمة ثابتة للطلب — مفتاح التخزين المؤقت في S-09:
 * نفس القطع + نفس الموديل = ما يتولّد مرتين.
 */
const stable = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(stable)
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .filter(([, v]) => v !== undefined)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, stable(v)]),
    )
  }
  return value
}

export async function requestHash(request: unknown): Promise<string> {
  const payload = new TextEncoder().encode(JSON.stringify(stable(request)))
  const digest = await crypto.subtle.digest('SHA-256', payload)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}
