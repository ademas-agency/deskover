import { createRouter, createWebHistory } from 'vue-router'
import { supabaseAuth as supabase } from '../infrastructure/api/client'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../presentation/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      path: '/',
      name: 'dashboard',
      component: () => import('../presentation/views/DashboardView.vue'),
    },
    {
      path: '/places',
      name: 'places',
      component: () => import('../presentation/views/PlacesListView.vue'),
    },
    {
      path: '/places/:id',
      name: 'place-edit',
      component: () => import('../presentation/views/PlaceEditView.vue'),
    },
    {
      path: '/map',
      name: 'map',
      component: () => import('../presentation/views/MapView.vue'),
    },
    {
      path: '/articles',
      name: 'articles',
      component: () => import('../presentation/views/ArticlesListView.vue'),
    },
    {
      path: '/articles/:slug',
      name: 'article-edit',
      component: () => import('../presentation/views/ArticleEditView.vue'),
    },
    {
      path: '/messages',
      name: 'messages',
      component: () => import('../presentation/views/MessagesView.vue'),
    },
    {
      path: '/avis',
      name: 'ratings',
      component: () => import('../presentation/views/RatingsView.vue'),
    },
    {
      path: '/seo',
      name: 'seo',
      component: () => import('../presentation/views/SeoView.vue'),
    },
  ],
})

// Auth guard
router.beforeEach(async (to) => {
  if (to.meta.public) return true

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return { name: 'login' }
  }
  return true
})

export default router
