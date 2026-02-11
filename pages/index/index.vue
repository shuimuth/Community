<template>
	<view class="page-container">
		<!-- 头部区域 -->
		<view class="header-section fade-in">
			<view class="logo-wrapper">
				<image class="logo" src="/static/logo.png" mode="aspectFit"></image>
			</view>
			<text class="app-title">社区应用</text>
			<text class="app-subtitle">选择您的登录方式</text>
		</view>

		<!-- 登录方式选择卡片 -->
		<view class="content-section fade-in-up">
			<view class="card">
				<view class="card-header">
					<text class="card-title">登录方式</text>
				</view>
				
				<uni-forms-item label="" labelWidth="0">
					<uni-data-checkbox 
						:multiple="false" 
						v-model="loginType" 
						:localdata="loginTypeOption"
						mode="tag"
						class="login-type-selector">
					</uni-data-checkbox>
				</uni-forms-item>
			</view>

			<!-- 操作按钮组 -->
			<view class="action-buttons">
				<button class="primary-btn" @click="toLogin" hover-class="btn-hover">
					<text class="btn-icon">🔐</text>
					<text class="btn-text">前往登录</text>
				</button>
				
				<button class="secondary-btn" @click="toUserInfoPage" hover-class="btn-hover">
					<text class="btn-icon">👤</text>
					<text class="btn-text">个人资料</text>
				</button>
			</view>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {
				loginType: "weixin",
				loginTypeOption: [{
					"value": "weixin",
					"text": "微信"
				}, {
					"value": "univerify",
					"text": "一键登录"
				}, {
					"value": "username",
					"text": "账号密码"
				}, {
					"value": "smsCode",
					"text": "手机验证码"
				},  {
					"value": "weixinMobile",
					"text": "微信手机号登录"
				}]
			}
		},
		onLoad() {},
		methods: {
			toLogin() {
				if (this.loginType == 'username') {
					uni.navigateTo({
						url: "/uni_modules/uni-id-pages/pages/login/login-withpwd"
					})
				} else {
					uni.navigateTo({
						url: "/uni_modules/uni-id-pages/pages/login/login-withoutpwd?type=" + this.loginType,
						animationType:"none",
						animationDuration:0
					})
				}
			},
			toUserInfoPage() {
				uni.navigateTo({
					url: "/uni_modules/uni-id-pages/pages/userinfo/userinfo?showLoginManage=true"
				})
			}
		}
	}
</script>

<style lang="scss">
	page {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		min-height: 100vh;
	}

	/* 页面容器 */
	.page-container {
		min-height: 100vh;
		padding: 60rpx 40rpx;
		display: flex;
		flex-direction: column;
		align-items: center;
	}

	/* 淡入动画 */
	@keyframes fadeIn {
		from {
			opacity: 0;
			transform: translateY(-20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	@keyframes fadeInUp {
		from {
			opacity: 0;
			transform: translateY(30px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.fade-in {
		animation: fadeIn 0.6s ease-out;
	}

	.fade-in-up {
		animation: fadeInUp 0.8s ease-out;
		animation-delay: 0.2s;
		animation-fill-mode: both;
	}

	/* 头部区域 */
	.header-section {
		text-align: center;
		margin-bottom: 60rpx;
	}

	.logo-wrapper {
		margin-bottom: 32rpx;
	}

	.logo {
		width: 160rpx;
		height: 160rpx;
		border-radius: 32rpx;
		box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.15);
	}

	.app-title {
		display: block;
		font-size: 56rpx;
		font-weight: 700;
		color: #ffffff;
		margin-bottom: 16rpx;
		letter-spacing: 1px;
		text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.2);
	}

	.app-subtitle {
		display: block;
		font-size: 28rpx;
		color: rgba(255, 255, 255, 0.9);
		font-weight: 400;
	}

	/* 内容区域 */
	.content-section {
		width: 100%;
		max-width: 680rpx;
	}

	/* 卡片样式 */
	.card {
		background: rgba(255, 255, 255, 0.95);
		backdrop-filter: blur(10px);
		border-radius: 24rpx;
		padding: 48rpx 40rpx;
		box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.12);
		margin-bottom: 40rpx;
	}

	.card-header {
		margin-bottom: 32rpx;
	}

	.card-title {
		font-size: 36rpx;
		font-weight: 600;
		color: #1a1a1a;
	}

	/* 登录方式选择器 */
	.login-type-selector {
		width: 100%;
	}

	/* 按钮组 */
	.action-buttons {
		display: flex;
		flex-direction: column;
		gap: 24rpx;
	}

	/* 主按钮 */
	.primary-btn {
		height: 96rpx;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		border-radius: 16rpx;
		border: none;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.4);
		transition: all 0.3s ease;
	}

	.primary-btn::after {
		border: none;
	}

	.btn-hover {
		transform: scale(0.98);
		box-shadow: 0 4rpx 16rpx rgba(102, 126, 234, 0.3);
	}

	/* 次要按钮 */
	.secondary-btn {
		height: 96rpx;
		background: rgba(255, 255, 255, 0.95);
		border-radius: 16rpx;
		border: 2rpx solid rgba(102, 126, 234, 0.3);
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
		transition: all 0.3s ease;
	}

	.secondary-btn::after {
		border: none;
	}

	/* 按钮文字 */
	.btn-icon {
		font-size: 40rpx;
		margin-right: 16rpx;
	}

	.btn-text {
		font-size: 32rpx;
		font-weight: 500;
	}

	.primary-btn .btn-text {
		color: #ffffff;
	}

	.secondary-btn .btn-text {
		color: #667eea;
	}

	/* 响应式设计 */
	@media screen and (min-width: 768px) {
		.page-container {
			padding: 100rpx 60rpx;
		}

		.content-section {
			max-width: 800rpx;
		}

		.action-buttons {
			flex-direction: row;
		}

		.primary-btn,
		.secondary-btn {
			flex: 1;
		}
	}
</style>
