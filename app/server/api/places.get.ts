import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

let cachedData: any[] | null = null

export default defineEventHandler(() => {
  if (!cachedData) {
    const filePath = resolve('public/data/enriched-places.json')
    const raw = readFileSync(filePath, 'utf-8')
    cachedData = JSON.parse(raw)
  }
  return cachedData
})
