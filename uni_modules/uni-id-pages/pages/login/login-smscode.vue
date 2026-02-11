<!-- 短信验证码登录页 - 优化版 -->
<template>
	<view class="uni-content">
		<!-- Logo区域 - 添加淡入动画 -->
		<view class="login-logo fade-in-down">
			<image :src="logo" mode="aspectFit" lazy-load></image>
		</view>
		
		<!-- 标题区域 - 优化视觉层次 -->
		<view class="header-section fade-in-up">
			<text class="title">验证码登录</text>
			<text class="tip">先输入图形验证码，再获取短信验证码</text>
		</view>
		
		<!-- 表单区域 -->
		<uni-forms class="login-form fade-in-up">
			<uni-id-pages-sms-form 
				focusCaptchaInput 
				v-model="code" 
				type="login-by-sms" 
				ref="smsCode" 
				:phone="phone">
			</uni-id-pages-sms-form>
			
			<!-- 优化后的登录按钮 - 添加加载状态 -->
			<button 
				class="uni-btn send-btn" 
				type="primary" 
				@click="submit"
				:loading="isLoading"
				:disabled="isLoading">
				{{ isLoading ? '登录中...' : '立即登录' }}
			</button>
		</uni-forms>
		
		<!-- 验证码弹窗 -->
		<uni-popup-captcha 
			@confirm="submit" 
			v-model="captcha" 
			scene="login-by-sms" 
			ref="popup">
		</uni-popup-captcha>
	</view>
</template>
<script>
	import mixin from '@/uni_modules/uni-id-pages/common/login-page.mixin.js';
	export default {
		mixins: [mixin],
	data() {
		return {
			code: "",
			phone: "",
			captcha: "",
			logo: "/static/logo.png",
			isLoading: false // 添加加载状态
		}
	},
		computed: {
			tipText() {
				return '验证码已通过短信发送至' + this.phone;
			},
		},
		onLoad({
			phoneNumber
		}) {
			this.phone = phoneNumber;
		},
		onShow() {
			// #ifdef H5
			document.onkeydown = event => {
				var e = event || window.event;
				if (e && e.keyCode == 13) { //回车键的键值为13
					this.submit()
				}
			};
			// #endif
		},
		methods: {
		// 优化后的提交方法 - 添加防抖和更好的错误处理
		submit() {
			// 防止重复提交
			if (this.isLoading) {
				return;
			}
			
			// 验证码格式校验
			if (!this.code || this.code.length !== 6) {
				this.$refs.smsCode.focusSmsCodeInput = true;
				return uni.showToast({
					title: '请输入6位验证码',
					icon: 'none',
					duration: 2000
				});
			}
			
			this.isLoading = true;
			
			const uniIdCo = uniCloud.importObject("uni-id-co", {
				errorOptions: {
					type: 'toast'
				}
			});
			
			uniIdCo.loginBySms({
				mobile: this.phone,
				code: this.code,
				captcha: this.captcha
			}).then(e => {
				this.loginSuccess(e);
			}).catch(e => {
				if (e.errCode === 'uni-id-captcha-required') {
					this.$refs.popup.open();
				} else {
					console.error('登录失败:', e.errMsg);
					uni.showToast({
						title: e.errMsg || '登录失败，请重试',
						icon: 'none',
						duration: 2000
					});
				}
			}).finally(() => {
				this.captcha = '';
				this.isLoading = false;
			});
		}
		}
	}
</script>
<style scoped lang="scss">
	@import "@/uni_modules/uni-id-pages/common/login-page.scss";

	/* 页面淡入动画 */
	@keyframes fadeInDown {
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
			transform: translateY(20px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	.fade-in-down {
		animation: fadeInDown 0.6s ease-out;
	}

	.fade-in-up {
		animation: fadeInUp 0.6s ease-out;
		animation-fill-mode: both;
	}

	.fade-in-up:nth-child(2) {
		animation-delay: 0.1s;
	}

	.fade-in-up:nth-child(3) {
		animation-delay: 0.2s;
	}

	/* 优化标题区域 */
	.header-section {
		margin-bottom: 32rpx;
	}

	.title {
		font-size: 48rpx;
		font-weight: 600;
		color: #1a1a1a;
		letter-spacing: -0.5px;
	}

	.tip {
		margin-top: 16rpx;
		font-size: 28rpx;
		color: #8a8a8a;
		line-height: 1.5;
	}

	.popup-captcha {
		/* #ifndef APP-NVUE */
		display: flex;
		/* #endif */
		padding: 20rpx;
		background-color: #FFF;
		border-radius: 2px;
		flex-direction: column;
		position: relative;
	}

	.popup-captcha .title {
		font-weight: normal;
		padding: 0;
		padding-bottom: 15px;
		color: #666;
	}

	.popup-captcha .close {
		position: absolute;
		bottom: -40px;
		margin-left: -13px;
		left: 50%;
	}

	.popup-captcha .uni-btn {
		margin: 0;
	}

	/* 优化登录表单 */
	.login-form {
		margin-top: 40rpx;
	}

	/* 优化按钮样式 */
	.send-btn {
		margin-top: 32rpx;
		height: 88rpx;
		line-height: 88rpx;
		border-radius: 12rpx;
		font-size: 32rpx;
		font-weight: 500;
		transition: all 0.3s ease;
		box-shadow: 0 4rpx 12rpx rgba(0, 122, 255, 0.25);
	}

	.send-btn:active {
		transform: scale(0.98);
		box-shadow: 0 2rpx 8rpx rgba(0, 122, 255, 0.2);
	}

	.send-btn[disabled] {
		opacity: 0.6;
		box-shadow: none;
	}

	/* Logo优化 */
	.login-logo image {
		width: 120rpx;
		height: 120rpx;
		border-radius: 24rpx;
	}
</style>
