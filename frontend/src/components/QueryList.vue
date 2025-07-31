<template>
  <div class="max-w-4xl mx-auto p-4">
    <h1 class="text-3xl font-bold mb-6 text-gray-900">租屋查詢列表</h1>
    
    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>
    
    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12 text-red-600">
      <p class="mb-4">載入查詢列表時發生錯誤</p>
      <p class="text-sm text-gray-500">{{ error.message }}</p>
      <button 
        @click="refetch" 
        class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        重新載入
      </button>
    </div>
    
    <!-- Search and Filter Controls -->
    <div v-else-if="queries.length > 0" class="mb-6">
      <div class="flex flex-col md:flex-row gap-4">
        <!-- Search Input -->
        <div class="flex-1">
          <div class="relative">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="搜尋查詢描述或地區..."
              class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <!-- Filter Controls -->
        <div class="flex gap-2">
          <select 
            v-model="filterRegion" 
            class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">所有地區</option>
            <option v-for="region in availableRegions" :key="region" :value="region">
              {{ region }}
            </option>
          </select>
          
          <select 
            v-model="sortBy" 
            class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="updatedAt">最新更新</option>
            <option value="rentalCount">房源數量</option>
            <option value="description">名稱</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Query List -->
    <div v-if="!isLoading && !error" class="grid gap-4">
      <RouterLink
        v-for="query in filteredAndSortedQueries"
        :key="query.id"
        :to="`/query/${query.id}`"
        class="query-card"
      >
        <div class="flex justify-between items-start">
          <div class="flex-1">
            <h3 class="text-lg font-semibold text-gray-900 mb-2">
              {{ query.description }}
            </h3>
            
            <div class="flex flex-wrap gap-4 text-sm text-gray-600">
              <div v-if="query.region" class="flex items-center gap-1">
                <MapPin class="w-4 h-4" />
                <span>地區: {{ query.region }}</span>
              </div>
              
              <div v-if="query.priceMin || query.priceMax" class="flex items-center gap-1">
                <DollarSign class="w-4 h-4" />
                <span>
                  價格: {{ formatPrice(query.priceMin) }} - {{ formatPrice(query.priceMax) }}
                </span>
              </div>
              
              <div v-if="query.stations" class="flex items-center gap-1">
                <Train class="w-4 h-4" />
                <span>捷運站: {{ query.stations }}</span>
              </div>
              
              <div class="flex items-center gap-1">
                <Clock class="w-4 h-4" />
                <span>
                  更新: {{ formatDate(query.updatedAt) }}
                </span>
              </div>
            </div>
          </div>
          
          <div class="text-right">
            <div class="flex items-center gap-1 text-2xl font-bold text-blue-600">
              <Home class="w-6 h-6" />
              <span>{{ query.rentalCount || 0 }}</span>
            </div>
            <p class="text-sm text-gray-500">間房源</p>
          </div>
        </div>
      </RouterLink>
    </div>

    <!-- Empty State -->
    <div v-if="!isLoading && !error && queries.length === 0" class="text-center py-12 text-gray-500">
      <Home class="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p>目前沒有可用的查詢</p>
    </div>

    <!-- No Results State -->
    <div v-if="!isLoading && !error && queries.length > 0 && filteredAndSortedQueries.length === 0" class="text-center py-12 text-gray-500">
      <Search class="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p>沒有符合篩選條件的查詢</p>
      <button 
        @click="clearFilters" 
        class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        清除篩選
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useQueries } from '../composables/useQueries'
import { Clock, Home, MapPin, DollarSign, Train, Search } from 'lucide-vue-next'

const { queries, isLoading, error, refetch } = useQueries()

// Filter and search state
const searchQuery = ref('')
const filterRegion = ref('')
const sortBy = ref<'updatedAt' | 'rentalCount' | 'description'>('updatedAt')

// Available regions for filtering
const availableRegions = computed(() => {
  const regions = queries.value
    .map(q => q.region)
    .filter((region): region is string => region !== null)
  return [...new Set(regions)].sort()
})

// Filtered and sorted queries
const filteredAndSortedQueries = computed(() => {
  let filtered = queries.value

  // Apply search filter
  if (searchQuery.value.trim()) {
    const searchTerm = searchQuery.value.toLowerCase()
    filtered = filtered.filter(query => 
      query.description.toLowerCase().includes(searchTerm) ||
      (query.region && query.region.toLowerCase().includes(searchTerm))
    )
  }

  // Apply region filter
  if (filterRegion.value) {
    filtered = filtered.filter(query => query.region === filterRegion.value)
  }

  // Apply sorting
  return [...filtered].sort((a, b) => {
    switch (sortBy.value) {
      case 'rentalCount':
        return (b.rentalCount || 0) - (a.rentalCount || 0)
      case 'description':
        return a.description.localeCompare(b.description, 'zh-TW')
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    }
  })
})

const clearFilters = () => {
  searchQuery.value = ''
  filterRegion.value = ''
  sortBy.value = 'updatedAt'
}

const formatPrice = (price: number | null) => {
  if (!price) return '不限'
  return price.toLocaleString()
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-TW')
}
</script>