<template>
  <div class="max-w-6xl mx-auto p-4">
    <!-- Navigation -->
    <div class="flex items-center gap-4 mb-6">
      <RouterLink 
        to="/" 
        class="flex items-center gap-2 text-blue-600 hover:text-blue-800"
      >
        <ArrowLeft class="w-4 h-4" />
        返回查詢列表
      </RouterLink>
      <h1 class="text-2xl font-bold text-gray-900">租屋列表</h1>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="text-center py-12 text-red-600">
      <p class="mb-4">載入租屋列表時發生錯誤</p>
      <p class="text-sm text-gray-500">{{ error.message }}</p>
      <button 
        @click="refetch" 
        class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
      >
        重新載入
      </button>
    </div>

    <template v-else>
      <!-- Search and Filter Controls -->
      <div class="mb-6" v-if="rentals.length > 0">
        <div class="flex flex-col lg:flex-row gap-4">
          <!-- Search Input -->
          <div class="flex-1">
            <div class="relative">
              <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                v-model="searchQuery"
                type="text"
                placeholder="搜尋房源標題、地區或捷運站..."
                class="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <!-- Filter Controls -->
          <div class="flex flex-wrap gap-2">
            <!-- Price Range Filter -->
            <div class="flex gap-1">
              <input
                v-model.number="priceMin"
                type="number"
                placeholder="最低價格"
                class="w-24 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
              <span class="self-center text-gray-500">-</span>
              <input
                v-model.number="priceMax"
                type="number"
                placeholder="最高價格"
                class="w-24 px-2 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
              />
            </div>
            
            <!-- House Type Filter -->
            <select 
              v-model="filterHouseType" 
              class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="">所有房型</option>
              <option v-for="houseType in availableHouseTypes" :key="houseType" :value="houseType">
                {{ houseType }}
              </option>
            </select>
            
            <!-- Sorting -->
            <select 
              v-model="sortBy" 
              class="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm"
            >
              <option value="firstSeen">最新發現</option>
              <option value="price">價格低到高</option>
              <option value="distance">捷運距離</option>
            </select>
            
            <!-- Clear Filters Button -->
            <button
              v-if="hasActiveFilters"
              @click="clearFilters"
              class="px-3 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 text-sm"
            >
              清除篩選
            </button>
          </div>
        </div>
        
        <!-- Results Count -->
        <div class="mt-3 text-sm text-gray-600">
          <span v-if="filteredAndSortedRentals.length !== rentals.length">
            顯示 {{ filteredAndSortedRentals.length }} / {{ rentals.length }} 間房源
          </span>
          <span v-else>
            共 {{ rentals.length }} 間房源
          </span>
        </div>
      </div>
      
      <!-- Rental List -->
      <div class="grid gap-6">
        <div
          v-for="rental in filteredAndSortedRentals"
          :key="rental.id"
          class="rental-card"
        >
          <div class="flex justify-between items-start mb-4">
            <h3 class="text-xl font-semibold text-gray-900 flex-1 mr-4">
              {{ rental.title }}
            </h3>
            
            <div v-if="rental.price" class="flex items-center gap-1 text-2xl font-bold text-green-600">
              <DollarSign class="w-6 h-6" />
              <span>{{ rental.price.toLocaleString() }}</span>
              <span class="text-sm text-gray-500">/月</span>
            </div>
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4 text-sm">
            <div class="space-y-2">
              <div>
                <span class="text-gray-600">房型：</span>
                <span class="font-medium">{{ rental.rooms || rental.houseType }}</span>
              </div>
              
              <div v-if="rental.metroTitle" class="flex items-center gap-1">
                <Train class="w-4 h-4 text-blue-500" />
                <span class="text-gray-600">捷運：</span>
                <span class="font-medium">{{ rental.metroTitle }}</span>
                <span v-if="rental.metroValue" class="text-blue-600">({{ rental.metroValue }})</span>
              </div>
            </div>
            
            <div class="space-y-2">
              <div class="flex items-center gap-1">
                <Calendar class="w-4 h-4 text-gray-400" />
                <span class="text-gray-600">首次發現：</span>
                <span>{{ formatDate(rental.firstSeen) }}</span>
              </div>
              
              <div class="flex items-center gap-1">
                <Calendar class="w-4 h-4 text-gray-400" />
                <span class="text-gray-600">最後更新：</span>
                <span>{{ formatDate(rental.lastSeen) }}</span>
              </div>
            </div>
            
            <!-- Metro Distances -->
            <div v-if="rental.metro_distances && rental.metro_distances.length > 0">
              <span class="text-gray-600 text-xs">附近捷運站：</span>
              <div class="space-y-1 mt-1">
                <div
                  v-for="metro in rental.metro_distances.slice(0, 3)"
                  :key="metro.id"
                  class="text-xs"
                >
                  <span class="font-medium">{{ metro.stationName }}</span>
                  <span v-if="metro.distance" class="text-blue-600 ml-1">
                    ({{ formatDistance(metro.distance) }})
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Link -->
          <div v-if="rental.link" class="flex justify-end">
            <a
              :href="rental.link"
              target="_blank"
              rel="noopener noreferrer"
              class="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm font-medium"
            >
              查看原始頁面
              <ExternalLink class="w-4 h-4" />
            </a>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-if="rentals.length === 0" class="text-center py-12 text-gray-500">
        <Home class="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>此查詢目前沒有房源資料</p>
      </div>

      <!-- No Results State -->
      <div v-if="rentals.length > 0 && filteredAndSortedRentals.length === 0" class="text-center py-12 text-gray-500">
        <Search class="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p>沒有符合篩選條件的房源</p>
        <button 
          @click="clearFilters" 
          class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          清除篩選
        </button>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useRentals } from '../composables/useRentals'
import { useRealtimeRentals } from '../composables/useRealtimeRentals'
import { ArrowLeft, ExternalLink, Train, Calendar, DollarSign, Home, Search } from 'lucide-vue-next'

type SortBy = 'firstSeen' | 'price' | 'distance'

const route = useRoute()
const queryId = computed(() => route.params.queryId as string)

// Filter and search state
const searchQuery = ref('')
const priceMin = ref<number | undefined>()
const priceMax = ref<number | undefined>()
const filterHouseType = ref('')
const sortBy = ref<SortBy>('firstSeen')

const { rentals, isLoading, error, refetch } = useRentals(queryId)

// Enable real-time updates
useRealtimeRentals(queryId, refetch)

// Available house types for filtering
const availableHouseTypes = computed(() => {
  const types = rentals.value
    .map(r => r.houseType)
    .filter(Boolean)
  return [...new Set(types)].sort()
})

// Check if filters are active
const hasActiveFilters = computed(() => {
  return searchQuery.value.trim() !== '' ||
         priceMin.value !== undefined ||
         priceMax.value !== undefined ||
         filterHouseType.value !== ''
})

// Filtered and sorted rentals
const filteredAndSortedRentals = computed(() => {
  if (!rentals.value) return []
  
  let filtered = rentals.value

  // Apply search filter
  if (searchQuery.value.trim()) {
    const searchTerm = searchQuery.value.toLowerCase()
    filtered = filtered.filter(rental => 
      rental.title.toLowerCase().includes(searchTerm) ||
      (rental.metroTitle && rental.metroTitle.toLowerCase().includes(searchTerm)) ||
      rental.metro_distances.some(metro => 
        metro.stationName.toLowerCase().includes(searchTerm)
      )
    )
  }

  // Apply price range filter
  if (priceMin.value !== undefined) {
    filtered = filtered.filter(rental => 
      rental.price !== null && rental.price >= priceMin.value!
    )
  }
  if (priceMax.value !== undefined) {
    filtered = filtered.filter(rental => 
      rental.price !== null && rental.price <= priceMax.value!
    )
  }

  // Apply house type filter
  if (filterHouseType.value) {
    filtered = filtered.filter(rental => rental.houseType === filterHouseType.value)
  }

  // Apply sorting
  return [...filtered].sort((a, b) => {
    switch (sortBy.value) {
      case 'price':
        return (a.price || 0) - (b.price || 0)
      case 'distance':
        // Sort by minimum metro distance
        const aDistance = Math.min(...a.metro_distances.map(d => d.distance || Infinity))
        const bDistance = Math.min(...b.metro_distances.map(d => d.distance || Infinity))
        return aDistance - bDistance
      default:
        // Sort by first appeared date (newest first)
        const aDate = a.query_rentals?.[0]?.firstAppeared || a.firstSeen
        const bDate = b.query_rentals?.[0]?.firstAppeared || b.firstSeen
        return new Date(bDate).getTime() - new Date(aDate).getTime()
    }
  })
})

const clearFilters = () => {
  searchQuery.value = ''
  priceMin.value = undefined
  priceMax.value = undefined
  filterHouseType.value = ''
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('zh-TW')
}

const formatDistance = (distance: number) => {
  if (distance > 1000) {
    return `${(distance / 1000).toFixed(1)}km`
  }
  return `${distance}m`
}
</script>