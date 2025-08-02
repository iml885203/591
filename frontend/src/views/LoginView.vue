<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <div class="max-w-md w-full space-y-8">
      <div>
        <h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
          登入系統
        </h2>
        <p class="mt-2 text-center text-sm text-gray-600">
          591 租屋監控系統
        </p>
      </div>
      
      <form class="mt-8 space-y-6" @submit.prevent="handleSubmit">
        <div class="rounded-md shadow-sm -space-y-px">
          <div>
            <label for="email" class="sr-only">Email</label>
            <input
              id="email"
              v-model="email"
              name="email"
              type="email"
              autocomplete="email"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="Email 地址"
            />
          </div>
          <div>
            <label for="password" class="sr-only">密碼</label>
            <input
              id="password"
              v-model="password"
              name="password"
              type="password"
              autocomplete="current-password"
              required
              class="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
              placeholder="密碼"
            />
          </div>
        </div>

        <!-- 驗證錯誤訊息 -->
        <div v-if="validationErrors.length > 0" class="text-red-600 text-sm bg-red-50 border border-red-200 rounded-md p-3">
          <ul class="list-disc list-inside space-y-1">
            <li v-for="validationError in validationErrors" :key="validationError">
              {{ validationError }}
            </li>
          </ul>
        </div>

        <!-- API 錯誤訊息 -->
        <div v-if="error" class="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-md p-3">
          {{ getErrorMessage(error) }}
        </div>


        <div>
          <button
            type="submit"
            :disabled="loading"
            class="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span v-if="loading" class="absolute left-0 inset-y-0 flex items-center pl-3">
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            </span>
            登入
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuth } from '../composables/useAuth'
import type { AuthError } from '@supabase/supabase-js'

const router = useRouter()
const { signIn, loading } = useAuth()

const email = ref('')
const password = ref('')
const error = ref<AuthError | null>(null)
const validationErrors = ref<string[]>([])

// 輸入驗證函數
const validateInput = (): boolean => {
  const errors: string[] = []
  
  // Email 格式驗證
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!email.value.trim()) {
    errors.push('Email 為必填欄位')
  } else if (!emailRegex.test(email.value)) {
    errors.push('請輸入有效的 Email 格式')
  }
  
  // 密碼必填驗證（移除強度要求）
  if (!password.value) {
    errors.push('密碼為必填欄位')
  }
  
  validationErrors.value = errors
  return errors.length === 0
}

const handleSubmit = async () => {
  error.value = null
  validationErrors.value = []

  // 前端驗證
  if (!validateInput()) {
    return
  }

  try {
    const result = await signIn(email.value, password.value)
    
    if (result.error) {
      error.value = result.error
    } else {
      router.push('/')
    }
  } catch (err) {
    error.value = err as AuthError
  }
}

const getErrorMessage = (error: AuthError): string => {
  switch (error.message) {
    case 'Invalid login credentials':
      return '登入資訊錯誤，請檢查 Email 和密碼'
    case 'Unable to validate email address: invalid format':
      return 'Email 格式不正確'
    case 'Email not confirmed':
      return '請先確認您的 Email 地址'
    default:
      return error.message || '發生未知錯誤'
  }
}
</script>