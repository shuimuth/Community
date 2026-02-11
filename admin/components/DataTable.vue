
<template>
  <view class="data-table-container">
    <!-- Search bar -->
    <view class="table-toolbar" v-if="showSearch">
      <view class="search-area">
        <input
          class="search-input"
          v-model="searchKeyword"
          :placeholder="searchPlaceholder"
          @confirm="onSearch"
        />
        <button class="search-btn" @tap="onSearch">搜索</button>
        <button class="reset-btn" @tap="onReset">重置</button>
      </view>
      <view class="action-area">
        <slot name="toolbar-actions"></slot>
      </view>
    </view>

    <!-- Filter tags -->
    <view class="filter-bar" v-if="activeFilters.length > 0">
      <text class="filter-label">筛选：</text>
      <view
        v-for="(filter, idx) in activeFilters"
        :key="idx"
        class="filter-tag"
      >
        <text class="tag-text">{{ filter.label }}: {{ filter.value }}</text>
        <text class="tag-close" @tap="$emit('remove-filter', filter.key)">×</text>
      </view>
      <text class="clear-all" @tap="$emit('clear-filters')">清除全部</text>
    </view>

    <!-- Table header -->
    <view class="table-header">
      <view
        v-for="col in columns"
        :key="col.key"
        class="header-cell"
        :style="{ width: col.width || 'auto', flex: col.width ? 'none' : '1' }"
      >
        <text class="header-text">{{ col.title }}</text>
      </view>
      <view class="header-cell action-col" v-if="showActions" style="width: 120px; flex: none;">
        <text class="header-text">操作</text>
      </view>
    </view>

    <!-- Table body -->
    <view v-if="data.length > 0" class="table-body">
      <view
        v-for="(row, rowIdx) in data"
        :key="row._id || rowIdx"
        class="table-row"
        :class="{ even: rowIdx % 2 === 0 }"
      >
        <view
          v-for="col in columns"
          :key="col.key"
          class="body-cell"
          :style="{ width: col.width || 'auto', flex: col.width ? 'none' : '1' }"
        >
          <slot :name="'cell-' + col.key" :row="row" :value="row[col.key]">
            <text class="cell-text">{{ formatCellValue(row, col) }}</text>
          </slot>
        </view>
        <view class="body-cell action-col" v-if="showActions" style="width: 120px; flex: none;">
          <slot name="actions" :row="row"></slot>
        </view>
      </view>
    </view>

    <!-- Empty state -->
    <view v-else class="empty-state">
      <text class="empty-text">{{ loading ? '加载中...' : '暂无数据' }}</text>
    </view>

    <!-- Pagination -->
    <view class="pagination" v-if="total > 0">
      <text class="page-info">共 {{ total }} 条，第 {{ currentPage }}/{{ totalPages }} 页</text>
      <view class="page-btns">
        <button
          class="page-btn"
          :disabled="currentPage <= 1"
          @tap="$emit('page-change', currentPage - 1)"
        >上一页</button>
        <button
          class="page-btn"
          :disabled="currentPage >= totalPages"
          @tap="$emit('page-change', currentPage + 1)"
        >下一页</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { formatDateTime } from '@/utils/admin'

interface Column {
  key: string
  title: string
  width?: string
  type?: 'text' | 'date' | 'amount' | 'status'
  formatter?: (value: any, row: any) => string
}

interface FilterTag {
  key: string
  label: string
  value: string
}

const props = withDefaults(defineProps<{
  columns: Column[]
  data: any[]
  total?: number
  currentPage?: number
  pageSize?: number
  loading?: boolean
  showSearch?: boolean
  showActions?: boolean
  searchPlaceholder?: string
  activeFilters?: FilterTag[]
}>(), {
  total: 0,
  currentPage: 1,
  pageSize: 20,
  loading: false,
  showSearch: true,
  showActions: true,
  searchPlaceholder: '请输入搜索关键词',
  activeFilters: () => []
})

const emit = defineEmits([
  'search', 'reset', 'page-change', 'remove-filter', 'clear-filters'
])

const searchKeyword = ref('')

const totalPages = computed(() => {
  return Math.ceil(props.total / props.pageSize) || 1
})

function formatCellValue(row: any, col: Column): string {
  const value = row[col.key]
  if (col.formatter) return col.formatter(value, row)
  if (col.type === 'date') return formatDateTime(value)
  if (col.type === 'amount') return '¥' + (value || 0).toFixed(2)
  if (value === null || value === undefined) return '-'
  return String(value)
}

function onSearch() {
  emit('search', searchKeyword.value)
}

function onReset() {
  searchKeyword.value = ''
  emit('reset')
}
</script>

<style lang="scss" scoped>
.data-table-container {
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
  flex-wrap: wrap;
  gap: 10px;

  .search-area {
    display: flex;
    align-items: center;
    gap: 8px;

    .search-input {
      width: 240px;
      height: 34px;
      padding: 0 12px;
      border: 1px solid #DCDFE6;
      border-radius: 4px;
      font-size: 13px;
    }

    .search-btn {
      height: 34px;
      line-height: 34px;
      padding: 0 16px;
      background-color: #409EFF;
      color: #fff;
      font-size: 13px;
      border: none;
      border-radius: 4px;

      &::after { border: none; }
    }

    .reset-btn {
      height: 34px;
      line-height: 34px;
      padding: 0 16px;
      background-color: #f5f7fa;
      color: #606266;
      font-size: 13px;
      border: 1px solid #DCDFE6;
      border-radius: 4px;

      &::after { border: none; }
    }
  }
}

.filter-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background-color: #fafafa;
  border-bottom: 1px solid #ebeef5;
  flex-wrap: wrap;

  .filter-label {
    font-size: 12px;
    color: #909399;
  }

  .filter-tag {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background-color: #ecf5ff;
    border-radius: 3px;

    .tag-text {
      font-size: 12px;
      color: #409EFF;
    }

    .tag-close {
      font-size: 14px;
      color: #409EFF;
      cursor: pointer;
    }
  }

  .clear-all {
    font-size: 12px;
    color: #F56C6C;
    cursor: pointer;
  }
}

.table-header {
  display: flex;
  align-items: center;
  padding: 0 20px;
  height: 44px;
  background-color: #fafbfc;
  border-bottom: 1px solid #ebeef5;

  .header-cell {
    .header-text {
      font-size: 13px;
      font-weight: 600;
      color: #606266;
    }
  }
}

.table-body {
  .table-row {
    display: flex;
    align-items: center;
    padding: 0 20px;
    min-height: 48px;
    border-bottom: 1px solid #ebeef5;
    transition: background-color 0.2s;

    &.even {
      background-color: #fafbfc;
    }

    &:hover {
      background-color: #f5f7fa;
    }
  }

  .body-cell {
    padding: 8px 4px;

    .cell-text {
      font-size: 13px;
      color: #333;
      word-break: break-all;
    }
  }

  .action-col {
    display: flex;
    gap: 8px;
  }
}

.empty-state {
  padding: 60px 0;
  text-align: center;

  .empty-text {
    font-size: 14px;
    color: #C0C4CC;
  }
}

.pagination {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 20px;
  border-top: 1px solid #ebeef5;

  .page-info {
    font-size: 13px;
    color: #909399;
  }

  .page-btns {
    display: flex;
    gap: 8px;

    .page-btn {
      height: 30px;
      line-height: 30px;
      padding: 0 14px;
      font-size: 12px;
      background-color: #fff;
      border: 1px solid #DCDFE6;
      border-radius: 4px;
      color: #606266;

      &:active { background-color: #ecf5ff; }
      &[disabled] { opacity: 0.4; }
      &::after { border: none; }
    }
  }
}
</style>
