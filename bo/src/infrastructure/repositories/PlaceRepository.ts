import type { Place } from '../../core/domain/entities/Place'

const DATA_URL = '/data/enriched-places.json'

export class PlaceRepository {
  static async getAll(): Promise<Place[]> {
    const response = await fetch(DATA_URL)
    if (!response.ok) {
      throw new Error('Impossible de charger les lieux')
    }
    return response.json()
  }

  static async getById(googlePlaceId: string): Promise<Place | undefined> {
    const places = await this.getAll()
    return places.find(p => p.google_place_id === googlePlaceId)
  }

  // Pour le moment, la sauvegarde est en memoire (store Pinia)
  // Sera remplace par Supabase plus tard
  static async save(_place: Place): Promise<void> {
    console.log('Save place - sera implemente avec Supabase')
  }
}
