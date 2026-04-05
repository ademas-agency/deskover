import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
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
  ],
})

export default router
