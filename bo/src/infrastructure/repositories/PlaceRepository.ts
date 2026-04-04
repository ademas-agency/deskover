import type { Place } from '../../core/domain/entities/Place'
import { supabase } from '../api/client'

function rowToPlace(row: any): Place {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    address: row.address || '',
    city: row.city,
    city_key: row.city_key,
    arrondissement: row.arrondissement,
    category: row.place_type,
    description: row.description || '',
    signals: row.signals || [],
    blog_mentions: (row.blog_mentions || []).map((m: any) => ({
      url: m.url,
      title: m.title || '',
      source: m.source || '',
    })),
    blog_mentions_count: row.blog_mentions_count || 0,
    google_place_id: row.google_place_id || '',
    google_name: row.google_name || row.name,
    latitude: row.latitude || 0,
    longitude: row.longitude || 0,
    google_rating: row.google_rating || 0,
    google_reviews_count: row.google_reviews_count || 0,
    google_maps_url: row.google_maps_url || '',
    website: row.website || '',
    phone: row.phone || '',
    photo_url: row.photo_url || '',
    photo_storage_path: row.photo_storage_path || '',
    opening_hours: row.opening_hours || [],
    business_status: row.business_status || '',
    status: row.status || '',
    instagram: row.instagram_handle || '',
  }
}

export class PlaceRepository {
  static async getAll(): Promise<Place[]> {
    // Supabase retourne 1000 lignes max par défaut, on pagine
    const all: any[] = []
    let from = 0
    const pageSize = 1000

    while (true) {
      const { data, error } = await supabase
        .from('places')
        .select('*, blog_mentions(*)')
        .order('curation_score', { ascending: false, nullsFirst: false })
        .range(from, from + pageSize - 1)

      if (error) throw new Error(error.message)
      if (!data || data.length === 0) break
      all.push(...data)
      if (data.length < pageSize) break
      from += pageSize
    }

    return all.map(rowToPlace)
  }

  static async getById(id: string): Promise<Place | undefined> {
    const { data, error } = await supabase
      .from('places')
      .select('*, blog_mentions(*)')
      .eq('id', id)
      .single()

    if (error || !data) return undefined
    return rowToPlace(data)
  }

  static async save(place: Place): Promise<void> {
    const payload = {
      name: place.name,
      address: place.address,
      city: place.city,
      place_type: place.category,
      description: place.description,
      signals: place.signals,
      website: place.website,
      phone: place.phone,
      instagram_handle: place.instagram,
      photo_storage_path: place.photo_storage_path || null,
      photo_url: place.photo_url || null,
    }

    console.log('[BO] Saving place', place.id, payload)

    const { data, error, count } = await supabase
      .from('places')
      .update(payload)
      .eq('id', place.id)
      .select()

    console.log('[BO] Save result:', { data, error, count })

    if (error) throw new Error(error.message)
    if (!data || data.length === 0) throw new Error('Aucune ligne mise à jour — ID introuvable: ' + place.id)
  }

  static async delete(id: string): Promise<void> {
    // Delete blog_mentions first (foreign key)
    await supabase.from('blog_mentions').delete().eq('place_id', id)

    const { error } = await supabase
      .from('places')
      .delete()
      .eq('id', id)

    if (error) throw new Error(error.message)
  }
}
