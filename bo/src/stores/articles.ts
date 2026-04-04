import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Article } from '../core/domain/entities/Article'
import { generateSlug } from '../core/domain/entities/Article'

export const useArticlesStore = defineStore('articles', () => {
  const articles = ref<Article[]>([])
  const loading = ref(false)

  const publishedArticles = computed(() =>
    articles.value.filter(a => a.status === 'published')
  )

  const draftArticles = computed(() =>
    articles.value.filter(a => a.status === 'draft')
  )

  async function fetchArticles() {
    loading.value = true
    try {
      const response = await fetch('/data/articles.json')
      if (response.ok) {
        articles.value = await response.json()
      }
    } catch {
      // articles.json might not exist yet
      articles.value = []
    } finally {
      loading.value = false
    }
  }

  function getArticleBySlug(slug: string): Article | undefined {
    return articles.value.find(a => a.slug === slug)
  }

  function saveArticle(article: Article) {
    const index = articles.value.findIndex(a => a.id === article.id)
    if (index >= 0) {
      articles.value[index] = { ...article, updated_at: new Date().toISOString() }
    } else {
      articles.value.push({
        ...article,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
    }
  }

  function createArticle(): Article {
    const id = crypto.randomUUID()
    const article: Article = {
      id,
      title: 'Nouvel article',
      slug: 'nouvel-article-' + id.slice(0, 8),
      city: '',
      cover_photo: '',
      content: '',
      meta_description: '',
      status: 'draft',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    articles.value.push(article)
    return article
  }

  function deleteArticle(id: string) {
    articles.value = articles.value.filter(a => a.id !== id)
  }

  return {
    articles,
    loading,
    publishedArticles,
    draftArticles,
    fetchArticles,
    getArticleBySlug,
    saveArticle,
    createArticle,
    deleteArticle,
  }
})
