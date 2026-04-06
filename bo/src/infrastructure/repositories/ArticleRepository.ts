import type { Article } from '../../core/domain/entities/Article'
import { supabase } from '../api/client'

function rowToArticle(row: any): Article {
  return {
    id: row.id,
    title: row.title || '',
    slug: row.slug || '',
    city: row.city || '',
    cover_photo: row.cover_image || '',
    content: row.content || '',
    meta_description: row.description || '',
    status: row.published ? 'published' : 'draft',
    created_at: row.created_at || '',
    updated_at: row.updated_at || row.created_at || '',
  }
}

function articleToRow(article: Article): Record<string, any> {
  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    city: article.city,
    cover_image: article.cover_photo,
    content: article.content,
    description: article.meta_description,
    published: article.status === 'published',
    updated_at: new Date().toISOString(),
  }
}

export class ArticleRepository {
  static async getAll(): Promise<Article[]> {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data || []).map(rowToArticle)
  }

  static async getById(id: string): Promise<Article | null> {
    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return null
    return rowToArticle(data)
  }

  static async save(article: Article): Promise<Article> {
    const row = articleToRow(article)
    const { data, error } = await supabase
      .from('articles')
      .upsert(row)
      .select()
      .single()

    if (error) throw error
    return rowToArticle(data)
  }

  static async delete(id: string): Promise<void> {
    const { error } = await supabase
      .from('articles')
      .delete()
      .eq('id', id)

    if (error) throw error
  }
}
