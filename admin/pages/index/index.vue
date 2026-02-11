
<template>
  <AdminLayout activeKey="dashboard">
    <!-- Stats cards -->
    <view class="stats-grid">
      <StatCard
        label="今日新增用户"
        :value="stats.todayNewUsers"
        icon="person"
        color="#409EFF"
        :trend="stats.usersTrend"
        suffix="人"
      />
      <StatCard
        label="今日新增任务"
        :value="stats.todayNewTasks"
        icon="list"
        color="#67C23A"
        :trend="stats.tasksTrend"
        suffix="个"
      />
      <StatCard
        label="今日交易额"
        :value="stats.todayAmount"
        icon="wallet"
        color="#E6A23C"
        :trend="stats.amountTrend"
        prefix="¥"
      />
      <StatCard
        label="今日完成任务"
        :value="stats.todayCompleted"
        icon="checkbox"
        color="#9B59B6"
        :trend="stats.completedTrend"
        suffix="个"
      />
    </view>

    <view class="stats-grid mt-20">
      <StatCard
        label="总用户数"
        :value="stats.totalUsers"
        icon="person"
        color="#409EFF"
        suffix="人"
      />
      <StatCard
        label="总任务数"
        :value="stats.totalTasks"
        icon="list"
        color="#67C23A"
        suffix="个"
      />
      <StatCard
        label="累计交易额"
        :value="stats.totalAmount"
        icon="wallet"
        color="#E6A23C"
        prefix="¥"
      />
      <StatCard
        label="待审核提现"
        :value="stats.pendingWithdrawals"
        icon="flag"
        color="#F56C6C"
        suffix="笔"
      />
    </view>

    <!-- Charts section -->
    <view class="charts-section mt-20">
      <!-- Date range filter -->
      <view class="chart-toolbar">
        <text class="section-title">数据趋势</text>
        <view class="date-tabs">
          <text
            v-for="tab in dateTabs"
            :key="tab.value"
            class="date-tab"
            :class="{ active: dateRange === tab.value }"
            @tap="switchDateRange(tab.value)"
          >{{ tab.label }}</text>
        </view>
      </view>

      <view class="chart-grid">
        <!-- User growth chart placeholder -->
        <view class="chart-card">
          <text class="chart-title">用户增长趋势</text>
          <view class="chart-body">
            <view
              v-for="(item, idx) in chartData.userGrowth"
              :key="idx"
              class="bar-item"
            >
              <view class="bar-fill" :style="{ height: getBarHeight(item.count, chartData.maxUser) }"></view>
              <text class="bar-label">{{ item.label }}</text>
            </view>
          </view>
        </view>

        <!-- Task trend chart placeholder -->
        <view class="chart-card">
          <text class="chart-title">任务发布趋势</text>
          <view class="chart-body">
            <view
              v-for="(item, idx) in chartData.taskTrend"
              :key="idx"
              class="bar-item"
            >
              <view class="bar-fill bar-green" :style="{ height: getBarHeight(item.count, chartData.maxTask) }"></view>
              <text class="bar-label">{{ item.label }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="chart-grid mt-20">
        <!-- Task type distribution -->
        <view class="chart-card">
          <text class="chart-title">任务类型分布</text>
          <view class="pie-list">
            <view
              v-for="(item, idx) in chartData.taskTypes"
              :key="idx"
              class="pie-item"
            >
              <view class="pie-color" :style="{ backgroundColor: typeColors[idx % typeColors.length] }"></view>
              <text class="pie-name">{{ item.name }}</text>
              <text class="pie-count">{{ item.count }}个</text>
              <text class="pie-percent">{{ item.percent }}%</text>
            </view>
          </view>
        </view>

        <!-- Task status distribution -->
        <view class="chart-card">
          <text class="chart-title">任务状态分布</text>
          <view class="status-bars">
            <view
              v-for="(item, idx) in chartData.taskStatus"
              :key="idx"
              class="status-bar-item"
            >
              <text class="status-name">{{ item.name }}</text>
              <view class="status-bar-bg">
                <view
                  class="status-bar-fill"
                  :style="{
                    width: item.percent + '%',
                    backgroundColor: statusColors[idx % statusColors.length]
                  }"
                ></view>
              </view>
              <text class="status-count">{{ item.count }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <!-- Recent activity -->
    <view class="recent-section mt-20">
      <view class="section-header flex-between">
        <text class="section-title">最近活动</text>
      </view>
      <view class="activity-list">
        <view
          v-for="(item, idx) in recentActivities"
          :key="idx"
          class="activity-item"
        >
          <view class="activity-dot" :style="{ backgroundColor: item.color }"></view>
          <text class="activity-text">{{ item.content }}</text>
          <text class="activity-time">{{ item.time }}</text>
        </view>
        <view v-if="recentActivities.length === 0" class="empty-activity">
          <text class="empty-text">暂无最近活动</text>
        </view>
      </view>
    </view>
  </AdminLayout>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import StatCard from '@/components/StatCard.vue'
import { adminCallCloud, formatDateTime } from '@/utils/admin'

const stats = reactive({
  todayNewUsers: 0,
  todayNewTasks: 0,
  todayAmount: '0.00',
  todayCompleted: 0,
  totalUsers: 0,
  totalTasks: 0,
  totalAmount: '0.00',
  pendingWithdrawals: 0,
  usersTrend: 0,
  tasksTrend: 0,
  amountTrend: 0,
  completedTrend: 0
})

const dateRange = ref('7d')
const dateTabs = [
  { label: '近7天', value: '7d' },
  { label: '近30天', value: '30d' },
  { label: '近90天', value: '90d' }
]

const chartData = reactive<{
  userGrowth: any[]
  taskTrend: any[]
  taskTypes: any[]
  taskStatus: any[]
  maxUser: number
  maxTask: number
}>({
  userGrowth: [],
  taskTrend: [],
  taskTypes: [],
  taskStatus: [],
  maxUser: 1,
  maxTask: 1
})

const recentActivities = ref<any[]>([])

const typeColors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#9B59B6', '#3498db']
const statusColors = ['#409EFF', '#E6A23C', '#9B59B6', '#67C23A', '#909399', '#F56C6C']

function getBarHeight(count: number, max: number): string {
  if (!max || !count) return '4px'
  return Math.max(4, (count / max) * 150) + 'px'
}

function switchDateRange(range: string) {
  dateRange.value = range
  loadChartData()
}

async function loadDashboard() {
  try {
    const res = await adminCallCloud('admin-dashboard', 'getOverview')
    if (res) {
      Object.assign(stats, res)
    }
  } catch (e) {
    console.error('Load dashboard failed:', e)
    // Use mock data for demo
    loadMockData()
  }
}

async function loadChartData() {
  try {
    const res = await adminCallCloud('admin-dashboard', 'getChartData', {
      range: dateRange.value
    })
    if (res) {
      Object.assign(chartData, res)
    }
  } catch (e) {
    console.error('Load chart data failed:', e)
    loadMockChartData()
  }
}

async function loadRecentActivities() {
  try {
    const res = await adminCallCloud('admin-dashboard', 'getRecentActivities')
    recentActivities.value = res?.list || []
  } catch (e) {
    console.error('Load activities failed:', e)
    loadMockActivities()
  }
}

function loadMockData() {
  Object.assign(stats, {
    todayNewUsers: 12,
    todayNewTasks: 8,
    todayAmount: '1,280.00',
    todayCompleted: 5,
    totalUsers: 1256,
    totalTasks: 3420,
    totalAmount: '128,560.00',
    pendingWithdrawals: 3,
    usersTrend: 15.2,
    tasksTrend: -3.5,
    amountTrend: 8.7,
    completedTrend: 12.0
  })
}

function loadMockChartData() {
  const days = dateRange.value === '7d' ? 7 : dateRange.value === '30d' ? 30 : 90
  const userGrowth = []
  const taskTrend = []
  let maxUser = 0
  let maxTask = 0
  const step = days > 14 ? Math.ceil(days / 10) : 1

  for (let i = days - 1; i >= 0; i -= step) {
    const d = new Date(Date.now() - i * 86400000)
    const label = `${d.getMonth() + 1}/${d.getDate()}`
    const uCount = Math.floor(Math.random() * 20) + 5
    const tCount = Math.floor(Math.random() * 15) + 3
    maxUser = Math.max(maxUser, uCount)
    maxTask = Math.max(maxTask, tCount)
    userGrowth.push({ label, count: uCount })
    taskTrend.push({ label, count: tCount })
  }

  chartData.userGrowth = userGrowth
  chartData.taskTrend = taskTrend
  chartData.maxUser = maxUser || 1
  chartData.maxTask = maxTask || 1

  chartData.taskTypes = [
    { name: '跑腿代取', count: 120, percent: 35 },
    { name: '家政清洁', count: 85, percent: 25 },
    { name: '维修安装', count: 55, percent: 16 },
    { name: '代驾出行', count: 40, percent: 12 },
    { name: '宠物照看', count: 25, percent: 7 },
    { name: '其他', count: 17, percent: 5 }
  ]

  chartData.taskStatus = [
    { name: '待接单', count: 45, percent: 30 },
    { name: '进行中', count: 32, percent: 21 },
    { name: '待确认', count: 18, percent: 12 },
    { name: '已完成', count: 42, percent: 28 },
    { name: '已取消', count: 10, percent: 7 },
    { name: '申诉中', count: 3, percent: 2 }
  ]
}

function loadMockActivities() {
  const now = Date.now()
  recentActivities.value = [
    { content: '用户 张三 发布了新任务「帮忙取快递」', time: formatDateTime(now - 300000), color: '#409EFF' },
    { content: '用户 李四 完成了任务「上门维修水管」', time: formatDateTime(now - 600000), color: '#67C23A' },
    { content: '用户 王五 提交了提现申请 ¥200.00', time: formatDateTime(now - 1200000), color: '#E6A23C' },
    { content: '新用户 赵六 注册并加入了「阳光花园」小区', time: formatDateTime(now - 1800000), color: '#9B59B6' },
    { content: '用户 小明 对任务「代买菜」发起了申诉', time: formatDateTime(now - 3600000), color: '#F56C6C' }
  ]
}

onMounted(() => {
  loadDashboard()
  loadChartData()
  loadRecentActivities()
})
</script>

<style lang="scss" scoped>
.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: repeat(2, 1fr);
  }
}

.charts-section {
  .chart-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;

    .date-tabs {
      display: flex;
      gap: 4px;
      background-color: #f0f2f5;
      border-radius: 6px;
      padding: 3px;

      .date-tab {
        padding: 6px 14px;
        font-size: 13px;
        color: #606266;
        border-radius: 4px;
        cursor: pointer;

        &.active {
          background-color: #fff;
          color: #409EFF;
          font-weight: 500;
          box-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
        }
      }
    }
  }
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
}

.chart-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
}

.chart-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  .chart-title {
    display: block;
    font-size: 14px;
    font-weight: 600;
    color: #333;
    margin-bottom: 16px;
  }

  .chart-body {
    display: flex;
    align-items: flex-end;
    gap: 4px;
    height: 170px;
    padding-top: 20px;

    .bar-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;

      .bar-fill {
        width: 70%;
        max-width: 30px;
        background: linear-gradient(180deg, #409EFF, #79bbff);
        border-radius: 3px 3px 0 0;
        min-height: 4px;
        transition: height 0.3s;

        &.bar-green {
          background: linear-gradient(180deg, #67C23A, #95d475);
        }
      }

      .bar-label {
        font-size: 10px;
        color: #909399;
        margin-top: 6px;
        white-space: nowrap;
      }
    }
  }

  .pie-list {
    .pie-item {
      display: flex;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1px solid #f5f5f5;

      &:last-child { border-bottom: none; }

      .pie-color {
        width: 10px;
        height: 10px;
        border-radius: 2px;
        margin-right: 10px;
        flex-shrink: 0;
      }

      .pie-name {
        flex: 1;
        font-size: 13px;
        color: #333;
      }

      .pie-count {
        font-size: 13px;
        color: #606266;
        margin-right: 12px;
      }

      .pie-percent {
        font-size: 13px;
        color: #909399;
        width: 40px;
        text-align: right;
      }
    }
  }

  .status-bars {
    .status-bar-item {
      display: flex;
      align-items: center;
      margin-bottom: 12px;

      &:last-child { margin-bottom: 0; }

      .status-name {
        width: 60px;
        font-size: 12px;
        color: #606266;
        flex-shrink: 0;
      }

      .status-bar-bg {
        flex: 1;
        height: 16px;
        background-color: #f0f2f5;
        border-radius: 8px;
        overflow: hidden;
        margin: 0 10px;

        .status-bar-fill {
          height: 100%;
          border-radius: 8px;
          transition: width 0.4s;
        }
      }

      .status-count {
        width: 40px;
        font-size: 12px;
        color: #909399;
        text-align: right;
        flex-shrink: 0;
      }
    }
  }
}

.recent-section {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  .section-header {
    margin-bottom: 16px;
  }

  .activity-list {
    .activity-item {
      display: flex;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid #f5f5f5;

      &:last-child { border-bottom: none; }

      .activity-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 12px;
        flex-shrink: 0;
      }

      .activity-text {
        flex: 1;
        font-size: 13px;
        color: #333;
      }

      .activity-time {
        font-size: 12px;
        color: #C0C4CC;
        margin-left: 12px;
        flex-shrink: 0;
      }
    }

    .empty-activity {
      padding: 40px 0;
      text-align: center;

      .empty-text {
        font-size: 13px;
        color: #C0C4CC;
      }
    }
  }
}
</style>
