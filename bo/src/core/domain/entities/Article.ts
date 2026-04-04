export interface Article {
  id: string
  title: string
  slug: string
  city: string
  cover_photo: string
  content: string
  meta_description: string
  status: 'draft' | 'published'
  created_at: string
  updated_at: string
}

export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}
