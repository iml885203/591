import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL!
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Type definitions based on the existing Prisma schema
export interface Query {
  id: string
  description: string
  region: string | null
  priceMin: number | null  
  priceMax: number | null
  stations: string | null
  isValid: boolean
  updatedAt: string
  rentalCount?: number
}

export interface Rental {
  id: string
  propertyId: string
  title: string
  link: string
  houseType: string
  rooms: string
  price: number | null
  metroTitle: string | null
  metroValue: string | null
  firstSeen: string
  lastSeen: string
  isActive: boolean
  metro_distances: MetroDistance[]
  query_rentals: QueryRental[]
}

export interface MetroDistance {
  id: string
  rentalId: string
  stationName: string
  distance: number | null
  metroValue: string
}

export interface QueryRental {
  queryId: string
  rentalId: string
  firstAppeared: string
  lastAppeared: string
  wasNotified: boolean
}