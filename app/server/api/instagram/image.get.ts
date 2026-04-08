export default defineEventHandler(async (event) => {
  const url = getQuery(event).url as string
  if (!url) throw createError({ statusCode: 400, message: 'url requis' })

  const res = await fetch(url)
  if (!res.ok) throw createError({ statusCode: 502, message: 'Image inaccessible' })

  const contentType = res.headers.get('content-type') || 'image/jpeg'
  const buffer = await res.arrayBuffer()

  setResponseHeader(event, 'Content-Type', contentType)
  setResponseHeader(event, 'Cache-Control', 'public, max-age=3600')
  return new Uint8Array(buffer)
})
