export interface Vital {
  icon: string
  label: string
  value: string
  status: 'good' | 'medium' | 'none'
}

export interface Place {
  id: string
  name: string
  type: string
  neighborhood: string
  city: string
  distance: string
  isOpen: boolean
  tag?: string
  image: string
  vitals: Vital[]
  address?: string
  phone?: string
  instagram?: string
  pricingLabel?: string
}

export interface PressItem {
  source: string
  title: string
  url?: string
}

export function useMockData() {
  const places: Place[] = [
    {
      id: '1',
      name: "L'Anticafé Beaubourg",
      type: 'Café',
      neighborhood: 'Beaubourg',
      city: 'Paris 3e',
      distance: '350m',
      isOpen: true,
      tag: 'Number one',
      image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=600&h=400&fit=crop',
      address: '42 Rue de Rivoli, Paris 3e',
      phone: '01 42 72 92 10',
      instagram: '@anticafe_beaubourg',
      pricingLabel: 'Consommation obligatoire · €€',
      vitals: [
        { icon: 'lucide:wifi', label: 'WiFi', value: 'Rapide', status: 'good' },
        { icon: 'lucide:zap', label: 'Prises', value: 'Partout', status: 'good' },
        { icon: 'lucide:utensils', label: 'Food', value: 'Complet', status: 'good' },
        { icon: 'lucide:sparkles', label: 'Style', value: 'Canon', status: 'good' }
      ]
    },
    {
      id: '2',
      name: 'Bibliothèque Sainte-Geneviève',
      type: 'Bibliothèque',
      neighborhood: 'Quartier Latin',
      city: 'Paris 5e',
      distance: '800m',
      isOpen: true,
      tag: 'Coup de coeur',
      image: 'https://images.unsplash.com/photo-1521017432531-fbd92d768814?w=600&h=400&fit=crop',
      vitals: [
        { icon: 'lucide:wifi', label: 'WiFi', value: 'Bon', status: 'good' },
        { icon: 'lucide:zap', label: 'Prises', value: 'Rares', status: 'medium' },
        { icon: 'lucide:utensils', label: 'Food', value: '—', status: 'none' },
        { icon: 'lucide:sparkles', label: 'Style', value: 'Superbe', status: 'good' }
      ]
    },
    {
      id: '3',
      name: 'The Hub Canal Saint-Martin',
      type: 'Coworking',
      neighborhood: 'Canal Saint-Martin',
      city: 'Paris 10e',
      distance: '1.2km',
      isOpen: true,
      image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=600&h=400&fit=crop',
      vitals: [
        { icon: 'lucide:wifi', label: 'WiFi', value: 'Rapide', status: 'good' },
        { icon: 'lucide:zap', label: 'Prises', value: 'Partout', status: 'good' },
        { icon: 'lucide:utensils', label: 'Food', value: 'Snacks', status: 'medium' },
        { icon: 'lucide:sparkles', label: 'Style', value: 'Sympa', status: 'medium' }
      ]
    },
    {
      id: '4',
      name: 'Café Craft Oberkampf',
      type: 'Café',
      neighborhood: 'Oberkampf',
      city: 'Paris 11e',
      distance: '1.5km',
      isOpen: false,
      image: 'https://images.unsplash.com/photo-1559925393-8be0ec4767c8?w=600&h=400&fit=crop',
      vitals: [
        { icon: 'lucide:wifi', label: 'WiFi', value: 'Rapide', status: 'good' },
        { icon: 'lucide:zap', label: 'Prises', value: 'Partout', status: 'good' },
        { icon: 'lucide:utensils', label: 'Food', value: 'Complet', status: 'good' },
        { icon: 'lucide:sparkles', label: 'Style', value: 'Canon', status: 'good' }
      ]
    }
  ]

  const filters = [
    { label: 'WiFi', value: 'wifi', active: false },
    { label: 'Prises', value: 'prises', active: false },
    { label: 'Food', value: 'food', active: false },
    { label: 'Style', value: 'style', active: false },
    { label: 'Cafés', value: 'cafe', active: true },
    { label: 'Bibliothèques', value: 'library', active: false },
    { label: 'Coworking', value: 'coworking', active: false },
    { label: 'Calme', value: 'calm', active: false }
  ]

  const press: PressItem[] = [
    { source: 'Le Bonbon', title: 'Top 10 cafés WiFi à Paris' },
    { source: 'Time Out', title: 'Les meilleurs coworkings' },
    { source: 'Konbini', title: 'Où bosser à Paris ?' }
  ]

  return { places, filters, press }
}
