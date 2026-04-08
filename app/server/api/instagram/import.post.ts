export default defineEventHandler(async (event) => {
  const { imageUrl } = await readBody(event)
  if (!imageUrl) throw createError({ statusCode: 400, message: 'imageUrl requis' })

  const res = await fetch(imageUrl)
  if (!res.ok) throw createError({ statusCode: 502, message: 'Impossible de télécharger l\'image' })

  const contentType = res.headers.get('content-type') || 'image/jpeg'
  const buffer = await res.arrayBuffer()

  setResponseHeader(event, 'Content-Type', contentType)
  return new Uint8Array(buffer)
})
