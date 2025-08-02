<template>
  <div class="min-h-screen bg-gray-50">
    <!-- 導航欄 -->
    <nav v-if="isAuthenticated" class="bg-white shadow-sm border-b border-gray-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex justify-between h-16">
          <div class="flex items-center">
            <RouterLink to="/" class="text-xl font-bold text-gray-900">
              591 租屋監控
            </RouterLink>
          </div>
          
          <div class="flex items-center space-x-4">
            <span class="text-sm text-gray-600">
              {{ user?.email }}
            </span>
            <button
              @click="handleSignOut"
              class="text-sm text-red-600 hover:text-red-500 font-medium"
            >
              登出
            </button>
          </div>
        </div>
      </div>
    </nav>

    <!-- 主要內容 -->
    <main>
      <RouterView />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from './composables/useAuth'

const router = useRouter()
const { user, isAuthenticated, signOut, initialize } = useAuth()

// 初始化認證系統
onMounted(() => {
  initialize()
})

// 登出處理
const handleSignOut = async () => {
  const result = await signOut()
  if (!result.error) {
    router.push('/login')
  }
}
</script>