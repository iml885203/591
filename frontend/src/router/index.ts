import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'QueryList',
      component: () => import('../components/QueryList.vue')
    },
    {
      path: '/query/:queryId',
      name: 'RentalList', 
      component: () => import('../components/RentalList.vue')
    }
  ]
})

export default router