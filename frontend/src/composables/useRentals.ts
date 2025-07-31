import { ref, computed, watchEffect, type Ref } from 'vue'
import { supabase, type Rental } from '../lib/supabase'

export const useRentals = (queryId: Ref<string>) => {
  const data = ref<Rental[]>([])
  const isLoading = ref(false)
  const error = ref<Error | null>(null)

  const fetchRentals = async () => {
    if (!queryId.value) return

    try {
      isLoading.value = true
      error.value = null

      const { data: rentalsData, error: rentalsError } = await supabase
        .from('rentals')
        .select(`
          *,
          metro_distances(*),
          query_rentals!inner(
            queryId,
            firstAppeared,
            lastAppeared,
            wasNotified
          )
        `)
        .eq('query_rentals.queryId', queryId.value)
        .eq('isActive', true)
        .order('query_rentals(firstAppeared)', { ascending: false })

      if (rentalsError) throw rentalsError

      data.value = rentalsData || []
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
    } finally {
      isLoading.value = false
    }
  }

  // Watch for queryId changes
  watchEffect(() => {
    if (queryId.value) {
      fetchRentals()
    }
  })

  const execute = async () => {
    await fetchRentals()
  }

  return {
    rentals: computed(() => data.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    refetch: execute
  }
}