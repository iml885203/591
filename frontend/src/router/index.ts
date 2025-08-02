import { createRouter, createWebHistory } from 'vue-router'
import { useAuth } from '../composables/useAuth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'Login',
      component: () => import('../views/LoginView.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/',
      name: 'QueryList',
      component: () => import('../components/QueryList.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/query/:queryId',
      name: 'RentalList', 
      component: () => import('../components/RentalList.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

// Auth Guard
router.beforeEach((to, from, next) => {
  const { isAuthenticated, loading } = useAuth()
  
  // 等待認證狀態載入完成
  if (loading.value) {
    // 可以顯示載入頁面，這裡簡單等待
    const checkAuth = () => {
      if (!loading.value) {
        // 載入完成，重新檢查路由
        if (to.meta.requiresAuth && !isAuthenticated.value) {
          next('/login')
        } else if (to.meta.requiresGuest && isAuthenticated.value) {
          next('/')
        } else {
          next()
        }
      } else {
        // 繼續等待
        setTimeout(checkAuth, 50)
      }
    }
    checkAuth()
    return
  }

  // 需要認證的頁面
  if (to.meta.requiresAuth && !isAuthenticated.value) {
    next('/login')
    return
  }

  // 已登入用戶不應該看到登入頁面
  if (to.meta.requiresGuest && isAuthenticated.value) {
    next('/')
    return
  }

  next()
})

export default router