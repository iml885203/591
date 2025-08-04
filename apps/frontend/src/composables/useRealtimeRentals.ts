import { onMounted, onUnmounted, type Ref } from 'vue'
import { supabase } from '../lib/supabase'
import type { RealtimeChannel } from '@supabase/supabase-js'

export const useRealtimeRentals = (queryId: Ref<string>, onUpdate: () => void) => {
  let subscription: RealtimeChannel | null = null

  onMounted(() => {
    // Subscribe to rental changes
    subscription = supabase
      .channel('rental-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rentals'
        },
        () => {
          // Trigger update when there are new rentals
          onUpdate()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'query_rentals'
        },
        () => {
          // Trigger update when query_rentals relationship changes
          onUpdate()
        }
      )
      .subscribe()
  })

  onUnmounted(() => {
    if (subscription) {
      subscription.unsubscribe()
    }
  })
}