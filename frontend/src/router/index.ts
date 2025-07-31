import { createRouter, createWebHistory } from 'vue-router'
import QueryList from '../components/QueryList.vue'
import RentalList from '../components/RentalList.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'QueryList',
      component: QueryList
    },
    {
      path: '/query/:queryId',
      name: 'RentalList', 
      component: RentalList
    }
  ]
})

export default router