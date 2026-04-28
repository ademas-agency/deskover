export type ImageStatus = 'missing' | 'external' | 'custom'

const SUPABASE_STORAGE_PATTERN = /\.supabase\.co\/storage\//

export function getImageStatus(url: string | null | undefined): ImageStatus {
  if (!url || url.trim() === '') return 'missing'
  if (SUPABASE_STORAGE_PATTERN.test(url)) return 'custom'
  return 'external'
}

export function imageStatusLabel(status: ImageStatus): string {
  if (status === 'missing') return 'Manquante'
  if (status === 'external') return 'URL'
  return 'OK'
}
