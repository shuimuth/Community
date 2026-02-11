
<template>
  <AdminLayout activeKey="config">
    <view class="page-header">
      <text class="page-title">系统配置</text>
      <button class="save-btn" :disabled="saving" @tap="saveConfig">
        {{ saving ? '保存中...' : '保存配置' }}
      </button>
    </view>

    <view class="config-sections">
      <!-- Platform fee -->
      <view class="config-card">
        <text class="card-title">平台费用设置</text>
        <view class="config-item">
          <view class="config-label">
            <text class="label-text">平台服务费率</text>
            <text class="label-desc">从每笔交易中抽取的服务费比例</text>
          </view>
          <view class="config-input-group">
            <input class="config-input" type="digit" v-model="config.platform_fee_rate" placeholder="0.1" />
            <text class="input-suffix">%</text>
          </view>
        </view>
        <view class="config-item">
          <view class="config-label">
            <text class="label-text">最低提现金额</text>
            <text class="label-desc">用户申请提现的最低金额限制</text>
          </view>
          <view class="config-input-group">
            <text class="input-prefix">¥</text>
            <input class="config-input" type="digit" v-model="config.min_withdraw_amount" placeholder="10" />
          </view>
        </view>
      </view>

      <!-- Task settings -->
      <view class="config-card">
        <text class="card-title">任务设置</text>
        <view class="config-item">
          <view class="config-label">
            <text class="label-text">最低报酬金额</text>
            <text class="label-desc">发布任务时允许的最低报酬</text>
          </view>
          <view class="config-input-group">
            <text class="input-prefix">¥</text>
            <input class="config-input" type="digit" v-model="config.min_reward" placeholder="1" />
          </view>
        </view>
        <view class="config-item">
          <view class="config-label">
            <text class="label-text">最高报酬金额</text>
            <text class="label-desc">发布任务时允许的最高报酬</text>
          </view>
          <view class="config-input-group">
            <text class="input-prefix">¥</text>
            <input class="config-input" type="digit" v-model="config.max_reward" placeholder="5000" />
          </view>
        </view>
        <view class="config-item">
          <view class="config-label">
            <text class="label-text">自动确认时间</text>
            <text class="label-desc">接单者提交完成后，发布者未确认则自动确认</text>
          </view>
          <view class="config-input-group">
            <input class="config-input" type="number" v-model="config.auto_confirm_hours" placeholder="24" />
            <text class="input-suffix">小时</text>
          </view>
        </view>
        <view class="config-item">
          <view class="config-label">
            <text class="label-text">任务最大图片数</text>
            <text class="label-desc">发布任务时允许上传的最大图片数量</text>
          </view>
          <view class="config-input-group">
            <input class="config-input" type="number" v-model="config.max_task_images" placeholder="6" />
            <text class="input-suffix">张</text>
          </view>
        </view>
      </view>

      <!-- Credit score settings -->
      <view class="config-card">
        <text class="card-title">信用分规则</text>
        <view class="config-item">
          <view class="config-label">
            <text class="label-text">初始信用分</text>
            <text class="label-desc">新用户注册时的初始信用分</text>
          </view>
          <input class="config-input" type="number" v-model="config.initial_credit_score" placeholder="100" />
        </view>
        <view class="config-item">
          <view class="config-label">
            <text class="label-text">实名认证加分</text>
          </view>
          <view class="config-input-group">
            <text class="input-prefix">+</text>
            <input class="config-input" type="number" v-model="config.credit_verify_bonus" placeholder="10" />
          </view>
        </view>
        <view class="config-item">
          <view class="config-label">
            <text class="label-text">完成任务加分</text>
          </view>
          <view class="config-input-group">
            <text class="input-prefix">+</text>
            <input class="config-input" type="number" v-model="config.credit_complete_bonus" placeholder="2" />
          </view>
        </view>
        <view class="config-item">
          <view class="config-label">
            <text class="label-text">好评加分</text>
          </view>
          <view class="config-input-group">
            <text class="input-prefix">+</text>
            <input class="config-input" type="number" v-model="config.credit_good_review_bonus" placeholder="3" />
          </view>
        </view>
        <view class="config-item">
          <view class="config-label">
            <text class="label-text">差评扣分</text>
          </view>
          <view class="config-input-group">
            <text class="input-prefix">-</text>
            <input class="config-input" type="number" v-model="config.credit_bad_review_penalty" placeholder="5" />
          </view>
        </view>
        <view class="config-item">
          <view class="config-label">
            <text class="label-text">取消接单扣分</text>
          </view>
          <view class="config-input-group">
            <text class="input-prefix">-</text>
            <input class="config-input" type="number" v-model="config.credit_cancel_penalty" placeholder="10" />
          </view>
        </view>
        <view class="config-item">
          <view class="config-label">
            <text class="label-text">投诉扣分</text>
          </view>
          <view class="config-input-group">
            <text class="input-prefix">-</text>
            <input class="config-input" type="number" v-model="config.credit_complaint_penalty" placeholder="20" />
          </view>
        </view>
        <view class="config-item">
          <view class="config-label">
            <text class="label-text">限制接单信用分阈值</text>
            <text class="label-desc">信用分低于此值将限制接单</text>
          </view>
          <input class="config-input" type="number" v-model="config.credit_limit_take_threshold" placeholder="60" />
        </view>
        <view class="config-item">
          <view class="config-label">
            <text class="label-text">限制发布信用分阈值</text>
            <text class="label-desc">信用分低于此值将限制发布</text>
          </view>
          <input class="config-input" type="number" v-model="config.credit_limit_publish_threshold" placeholder="40" />
        </view>
      </view>
    </view>
  </AdminLayout>
</template>

<script setup lang="ts">
import { reactive, ref, onMounted } from 'vue'
import AdminLayout from '@/components/AdminLayout.vue'
import { adminCallCloud } from '@/utils/admin'

const saving = ref(false)
const config = reactive<Record<string, any>>({
  platform_fee_rate: '0.1',
  min_withdraw_amount: '10',
  min_reward: '1',
  max_reward: '5000',
  auto_confirm_hours: '24',
  max_task_images: '6',
  initial_credit_score: '100',
  credit_verify_bonus: '10',
  credit_complete_bonus: '2',
  credit_good_review_bonus: '3',
  credit_bad_review_penalty: '5',
  credit_cancel_penalty: '10',
  credit_complaint_penalty: '20',
  credit_limit_take_threshold: '60',
  credit_limit_publish_threshold: '40'
})

async function loadConfig() {
  try {
    const res = await adminCallCloud('admin-config', 'getConfig')
    if (res) {
      Object.keys(config).forEach(key => {
        if (res[key] !== undefined) {
          config[key] = String(res[key])
        }
      })
    }
  } catch (e) {
    console.error('Load config failed:', e)
  }
}

async function saveConfig() {
  saving.value = true
  try {
    const params: Record<string, number> = {}
    Object.keys(config).forEach(key => {
      params[key] = parseFloat(config[key]) || 0
    })
    await adminCallCloud('admin-config', 'updateConfig', params)
    uni.showToast({ title: '保存成功', icon: 'success' })
  } catch (e) {
    console.error('Save config failed:', e)
  } finally {
    saving.value = false
  }
}

onMounted(() => { loadConfig() })
</script>

<style lang="scss" scoped>
.page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;
  .page-title { font-size: 18px; font-weight: 600; color: #333; }
  .save-btn { height: 36px; line-height: 36px; padding: 0 20px; background-color: #409EFF; color: #fff; font-size: 14px; border: none; border-radius: 4px; &[disabled] { opacity: 0.6; } &::after { border: none; } }
}

.config-sections {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.config-card {
  background-color: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);

  .card-title {
    display: block;
    font-size: 16px;
    font-weight: 600;
    color: #333;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid #ebeef5;
  }

  .config-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 0;
    border-bottom: 1px solid #f5f5f5;

    &:last-child { border-bottom: none; }

    .config-label {
      flex: 1;
      .label-text { display: block; font-size: 14px; color: #333; }
      .label-desc { display: block; font-size: 12px; color: #909399; margin-top: 4px; }
    }

    .config-input {
      width: 120px;
      height: 36px;
      padding: 0 12px;
      border: 1px solid #DCDFE6;
      border-radius: 4px;
      font-size: 14px;
      text-align: right;
      color: #333;
    }

    .config-input-group {
      display: flex;
      align-items: center;
      gap: 6px;

      .input-prefix { font-size: 14px; color: #909399; }
      .input-suffix { font-size: 13px; color: #909399; }
    }
  }
}
</style>
