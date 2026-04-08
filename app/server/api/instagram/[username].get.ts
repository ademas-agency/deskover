const IG_HEADERS = {
  'X-IG-App-ID': '936619743392459',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': '*/*',
  'Accept-Language': 'fr-FR,fr;q=0.9',
  'Referer': 'https://www.instagram.com/',
}

export default defineEventHandler(async (event) => {
  const username = getRouterParam(event, 'username')?.replace('@', '')
  if (!username) throw createError({ statusCode: 400, message: 'Username requis' })

  const res = await fetch(
    `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
    { headers: IG_HEADERS }
  )
  if (!res.ok) throw createError({ statusCode: res.status, message: 'Impossible de récupérer le feed Instagram' })

  const data = await res.json()
  const edges = data?.data?.user?.edge_owner_to_timeline_media?.edges || []

  return edges
    .filter((edge: any) => !edge.node.is_video)
    .map((edge: any) => ({
      id: edge.node.id,
      shortcode: edge.node.shortcode,
      thumbnail: edge.node.thumbnail_src,
      url: edge.node.display_url,
      caption: edge.node.edge_media_to_caption?.edges?.[0]?.node?.text || '',
    }))
})
