import { ref, computed, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import type { User, Session, AuthError } from '@supabase/supabase-js'

const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const loading = ref(true)

export const useAuth = () => {
  const isAuthenticated = computed(() => !!user.value)
  
  // 登入
  const signIn = async (email: string, password: string) => {
    try {
      loading.value = true
      
      // 基本輸入驗證
      if (!email?.trim() || !password?.trim()) {
        throw new Error('Email 和密碼為必填欄位')
      }
      
      // Email 格式驗證
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
      if (!emailRegex.test(email.trim())) {
        throw new Error('Email 格式不正確')
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password
      })
      
      if (error) {
        // 記錄錯誤以便監控
        console.error('Authentication error:', {
          message: error.message,
          status: error.status,
          timestamp: new Date().toISOString()
        })
        throw error
      }
      
      return { user: data.user, session: data.session, error: null }
    } catch (error) {
      const authError = error as AuthError
      
      // 提供更友善的錯誤訊息
      let friendlyMessage = authError.message
      if (authError.message?.includes('Invalid login credentials')) {
        friendlyMessage = 'Invalid login credentials'
      } else if (authError.message?.includes('Email not confirmed')) {
        friendlyMessage = 'Email not confirmed'
      }
      
      return { 
        user: null, 
        session: null, 
        error: { ...authError, message: friendlyMessage } as AuthError 
      }
    } finally {
      loading.value = false
    }
  }


  // 登出
  const signOut = async () => {
    try {
      loading.value = true
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      
      user.value = null
      session.value = null
      
      return { error: null }
    } catch (error) {
      return { error: error as AuthError }
    } finally {
      loading.value = false
    }
  }

  // 監聽認證狀態變化
  const initialize = () => {
    // 獲取當前 session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      session.value = currentSession
      user.value = currentSession?.user || null
      loading.value = false
    })

    // 監聽認證狀態變化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        session.value = currentSession
        user.value = currentSession?.user || null
        loading.value = false
      }
    )

    return subscription
  }

  return {
    // 狀態
    user: computed(() => user.value),
    session: computed(() => session.value),
    isAuthenticated,
    loading: computed(() => loading.value),
    
    // 方法
    signIn,
    signOut,
    initialize
  }
}