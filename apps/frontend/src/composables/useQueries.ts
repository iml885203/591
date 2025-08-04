import { ref, computed } from 'vue'
import { supabase, type Query } from '../lib/supabase'

export const useQueries = () => {
  const data = ref<Query[]>([])
  const isLoading = ref(true)
  const error = ref<Error | null>(null)

  const fetchQueries = async () => {
    try {
      isLoading.value = true
      error.value = null

      const { data: queriesData, error: queriesError } = await supabase
        .from('queries')
        .select(`
          id,
          description,  
          region,
          priceMin,
          priceMax,
          stations,
          isValid,
          updatedAt
        `)
        .eq('isValid', true)
        .order('updatedAt', { ascending: false })

      if (queriesError) throw queriesError

      // Get rental counts for each query
      const queriesWithCounts = await Promise.all(
        (queriesData || []).map(async (query) => {
          const { count, error: countError } = await supabase
            .from('query_rentals')
            .select('*', { count: 'exact', head: true })
            .eq('queryId', query.id)

          if (countError) {
            console.warn(`Failed to get count for query ${query.id}:`, countError)
            return { ...query, rentalCount: 0 }
          }

          return { ...query, rentalCount: count || 0 }
        })
      )

      data.value = queriesWithCounts
    } catch (err) {
      error.value = err instanceof Error ? err : new Error(String(err))
    } finally {
      isLoading.value = false
    }
  }

  const execute = async () => {
    await fetchQueries()
  }

  // Initial fetch
  fetchQueries()

  return {
    queries: computed(() => data.value),
    isLoading: computed(() => isLoading.value),
    error: computed(() => error.value),
    refetch: execute
  }
}