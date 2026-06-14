export function many2one(v: [number, string] | false | null | undefined): string {
  if (v === false || v === null || v === undefined) return ''
  if (Array.isArray(v)) return String(v[1])
  return ''
}

export function odooScalar(v: string | number | boolean | false | null | undefined): string {
  if (v === false || v === null || v === undefined) return ''
  return String(v)
}
