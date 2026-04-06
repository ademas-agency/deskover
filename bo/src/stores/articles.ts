import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Article } from '../core/domain/entities/Article'
import { ArticleRepository } from '../infrastructure/repositories/ArticleRepository'

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
      articles.value = await ArticleRepository.getAll()
    } catch (err) {
      console.error('Failed to fetch articles:', err)
      articles.value = []
    } finally {
      loading.value = false
    }
  }

  function getArticleBySlug(slug: string): Article | undefined {
    return articles.value.find(a => a.slug === slug)
  }

  async function saveArticle(article: Article) {
    const saved = await ArticleRepository.save(article)
    const index = articles.value.findIndex(a => a.id === saved.id)
    if (index >= 0) {
      articles.value[index] = saved
    } else {
      articles.value.unshift(saved)
    }
    return saved
  }

  function createArticle(): Article {
    const id = crypto.randomUUID()
    return {
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
  }

  async function deleteArticle(id: string) {
    await ArticleRepository.delete(id)
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
