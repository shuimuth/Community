<script>
	import uniIdPageInit from '@/uni_modules/uni-id-pages/init.js';
	import { useUserStore } from '@/store/user';
	import { useAppStore } from '@/store/app';
	import { store as uniIdStore } from '@/uni_modules/uni-id-pages/common/store.js';

	export default {
		onLaunch: async function() {
			console.log('App Launch')
			await uniIdPageInit()

			// Initialize user state
			const userStore = useUserStore()
			const token = uni.getStorageSync('uni_id_token')
			if (token) {
				userStore.setToken(token)

				// Immediately sync basic info from uni-id-pages store (local cache, no network needed)
				if (uniIdStore.hasLogin && uniIdStore.userInfo?._id) {
					const cachedInfo = uniIdStore.userInfo
					userStore.setUserInfo({
						_id: cachedInfo._id,
						nickname: cachedInfo.nickname || '',
						avatar: cachedInfo.avatar_file?.url || cachedInfo.avatar || '',
						real_name: cachedInfo.real_name || '',
						mobile: cachedInfo.mobile || '',
						gender: cachedInfo.gender || 0,
						credit_score: 100,
						balance: 0,
						frozen_balance: 0,
						is_verified: false,
						points: 0,
						member_level: 0,
						is_merchant: false,
						role: cachedInfo.role || [],
						status: 0
					})
				}

				// Load full user info from cloud (will overwrite above with complete data)
				try {
					const userCenter = uniCloud.importObject('user-center')
					const userInfo = await userCenter.getUserInfo()
					if (userInfo) {
						userStore.setUserInfo(userInfo)
					}
				} catch (e) {
					console.error('Auto login failed:', e)
					// Keep the cached info from uni-id-pages store
				}

				// Load user communities
				try {
					const communityService = uniCloud.importObject('community-service')
					const communities = await communityService.getUserCommunities()
					userStore.setCommunities(communities || [])
				} catch (e) {
					console.error('Load communities failed:', e)
				}
			}

			// Load system config
			const appStore = useAppStore()
			await appStore.loadSystemConfig()
		},
		onShow: function() {
			console.log('App Show')
		},
		onHide: function() {
			console.log('App Hide')
		}
	}
</script>

<style lang="scss">
/* ============================================================
   Community Task Platform — Global Styles
   Design System v2.0 — Warm Orange Theme
   ============================================================ */

/* ── Base Reset ─────────────────────────────────────────────── */
page {
	font-family: $uni-font-family;
	font-size: $uni-font-size-base;
	color: $uni-text-color;
	background-color: $uni-bg-color-grey;
	line-height: $uni-line-height-base;
	-webkit-font-smoothing: antialiased;
	-moz-osx-font-smoothing: grayscale;
	-webkit-tap-highlight-color: transparent;
}

view, text, scroll-view, swiper {
	box-sizing: border-box;
}

image {
	display: block;
	width: 100%;
	height: auto;
}

/* ── Safe Area ──────────────────────────────────────────────── */
.safe-area-bottom {
	padding-bottom: constant(safe-area-inset-bottom);
	padding-bottom: env(safe-area-inset-bottom);
}

.safe-area-top {
	padding-top: constant(safe-area-inset-top);
	padding-top: env(safe-area-inset-top);
}

/* ── Layout Utilities ───────────────────────────────────────── */
.flex-row {
	display: flex;
	flex-direction: row;
	align-items: center;
}

.flex-col {
	display: flex;
	flex-direction: column;
}

.flex-center {
	display: flex;
	align-items: center;
	justify-content: center;
}

.flex-between {
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.flex-wrap {
	display: flex;
	flex-wrap: wrap;
}

.flex-1 {
	flex: 1;
	min-width: 0;
}

/* ── Typography Utilities ───────────────────────────────────── */
.text-ellipsis {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.text-clamp-2 {
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.text-clamp-3 {
	display: -webkit-box;
	-webkit-line-clamp: 3;
	-webkit-box-orient: vertical;
	overflow: hidden;
}

.text-primary {
	color: $uni-color-primary;
}

.text-secondary {
	color: $uni-text-color-secondary;
}

.text-grey {
	color: $uni-text-color-grey;
}

.text-success {
	color: $uni-color-success;
}

.text-warning {
	color: $uni-color-warning;
}

.text-error {
	color: $uni-color-error;
}

.text-bold {
	font-weight: $uni-font-weight-semibold;
}

/* ── Card Component Base ────────────────────────────────────── */
.card {
	background-color: $uni-bg-color-card;
	border-radius: $uni-border-radius-lg;
	box-shadow: $uni-shadow-card;
	padding: $uni-spacing-base;
	margin-bottom: $uni-spacing-md;
	transition: $uni-transition-fast;

	&:active {
		transform: scale(0.985);
		box-shadow: $uni-shadow-sm;
	}
}

.card-flat {
	background-color: $uni-bg-color-card;
	border-radius: $uni-border-radius-lg;
	padding: $uni-spacing-base;
	margin-bottom: $uni-spacing-md;
}

/* ── Button System ──────────────────────────────────────────── */
.btn-primary {
	background: $brand-gradient;
	color: $uni-text-color-inverse;
	border: none;
	border-radius: $uni-border-radius-pill;
	font-size: $uni-font-size-base;
	font-weight: $uni-font-weight-semibold;
	height: 48px;
	line-height: 48px;
	text-align: center;
	letter-spacing: 0.5px;
	box-shadow: 0 4px 12px rgba(255, 122, 69, 0.25);
	transition: $uni-transition-base;

	&:active {
		opacity: $uni-opacity-pressed;
		transform: scale(0.97);
		box-shadow: 0 2px 6px rgba(255, 122, 69, 0.20);
	}

	&.btn-disabled,
	&[disabled] {
		opacity: $uni-opacity-disabled;
		pointer-events: none;
	}
}

.btn-secondary {
	background-color: $uni-color-primary-pale;
	color: $uni-color-primary;
	border: none;
	border-radius: $uni-border-radius-pill;
	font-size: $uni-font-size-sm;
	font-weight: $uni-font-weight-medium;
	height: 40px;
	line-height: 40px;
	text-align: center;
	transition: $uni-transition-base;

	&:active {
		background-color: $uni-color-primary-lighter;
		transform: scale(0.97);
	}
}

.btn-outline {
	background-color: transparent;
	color: $uni-color-primary;
	border: 1px solid $uni-color-primary;
	border-radius: $uni-border-radius-pill;
	font-size: $uni-font-size-sm;
	font-weight: $uni-font-weight-medium;
	height: 40px;
	line-height: 38px;
	text-align: center;
	transition: $uni-transition-base;

	&:active {
		background-color: $uni-color-primary-pale;
		transform: scale(0.97);
	}
}

.btn-ghost {
	background-color: transparent;
	color: $uni-text-color-secondary;
	border: 1px solid $uni-border-color;
	border-radius: $uni-border-radius-pill;
	font-size: $uni-font-size-sm;
	height: 36px;
	line-height: 34px;
	text-align: center;
	transition: $uni-transition-base;

	&:active {
		background-color: $uni-bg-color-hover;
	}
}

.btn-sm {
	height: 32px;
	line-height: 32px;
	font-size: $uni-font-size-sm;
	padding: 0 $uni-spacing-base;
	border-radius: $uni-border-radius-pill;
}

.btn-lg {
	height: 52px;
	line-height: 52px;
	font-size: $uni-font-size-lg;
}

.btn-block {
	width: 100%;
}

/* ── Tag / Badge System ─────────────────────────────────────── */
.tag {
	display: inline-flex;
	align-items: center;
	padding: 2px 10px;
	border-radius: $uni-border-radius-pill;
	font-size: $uni-font-size-xs;
	font-weight: $uni-font-weight-medium;
	line-height: 1.6;
}

.tag-primary {
	background-color: $uni-color-primary-pale;
	color: $uni-color-primary;
}

.tag-success {
	background-color: $uni-color-success-pale;
	color: $uni-color-success;
}

.tag-warning {
	background-color: $uni-color-warning-pale;
	color: $uni-color-warning;
}

.tag-error {
	background-color: $uni-color-error-pale;
	color: $uni-color-error;
}

.tag-info {
	background-color: $uni-color-info-pale;
	color: $uni-color-info;
}

/* Legacy alias */
.status-tag {
	@extend .tag;
}

/* Badge dot */
.badge-dot {
	position: relative;

	&::after {
		content: '';
		position: absolute;
		top: -2px;
		right: -2px;
		width: 8px;
		height: 8px;
		border-radius: $uni-border-radius-circle;
		background-color: $uni-color-error;
		border: 2px solid $uni-bg-color;
	}
}

/* ── Divider ────────────────────────────────────────────────── */
.divider {
	height: 1px;
	background-color: $uni-border-color-light;
	margin: $uni-spacing-md 0;
}

.divider-thick {
	height: 8px;
	background-color: $uni-bg-color-grey;
}

/* ── Section Header ─────────────────────────────────────────── */
.section-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: $uni-spacing-base;

	.section-title {
		font-size: $uni-font-size-lg;
		font-weight: $uni-font-weight-semibold;
		color: $uni-text-color;
	}

	.section-more {
		font-size: $uni-font-size-sm;
		color: $uni-text-color-grey;
	}
}

/* ── Avatar ─────────────────────────────────────────────────── */
.avatar {
	width: $uni-img-size-avatar;
	height: $uni-img-size-avatar;
	border-radius: $uni-border-radius-circle;
	overflow: hidden;
	flex-shrink: 0;
	background-color: $uni-bg-color-grey;
}

.avatar-sm {
	width: $uni-img-size-base;
	height: $uni-img-size-base;
}

.avatar-lg {
	width: $uni-img-size-xl;
	height: $uni-img-size-xl;
}

/* ── Animation Keyframes ────────────────────────────────────── */
@keyframes fadeIn {
	from { opacity: 0; }
	to { opacity: 1; }
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

@keyframes scaleIn {
	from {
		opacity: 0;
		transform: scale(0.9);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}

@keyframes slideInRight {
	from {
		opacity: 0;
		transform: translateX(30px);
	}
	to {
		opacity: 1;
		transform: translateX(0);
	}
}

@keyframes pulse {
	0%, 100% { transform: scale(1); }
	50% { transform: scale(1.05); }
}

@keyframes shimmer {
	0% { background-position: -200% 0; }
	100% { background-position: 200% 0; }
}

/* ── Animation Utility Classes ──────────────────────────────── */
.anim-fade-in {
	animation: fadeIn $uni-animation-duration-base ease-out both;
}

.anim-fade-in-up {
	animation: fadeInUp $uni-animation-duration-base ease-out both;
}

.anim-fade-in-down {
	animation: fadeInDown $uni-animation-duration-base ease-out both;
}

.anim-scale-in {
	animation: scaleIn $uni-animation-duration-base cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

.anim-slide-right {
	animation: slideInRight $uni-animation-duration-base ease-out both;
}

/* Staggered animation delay helpers */
.anim-delay-1 { animation-delay: 0.05s; }
.anim-delay-2 { animation-delay: 0.10s; }
.anim-delay-3 { animation-delay: 0.15s; }
.anim-delay-4 { animation-delay: 0.20s; }
.anim-delay-5 { animation-delay: 0.25s; }
.anim-delay-6 { animation-delay: 0.30s; }

/* ── Skeleton Loading ───────────────────────────────────────── */
.skeleton {
	background: linear-gradient(
		90deg,
		$uni-bg-color-grey 25%,
		$uni-bg-color-hover 50%,
		$uni-bg-color-grey 75%
	);
	background-size: 200% 100%;
	animation: shimmer 1.5s ease-in-out infinite;
	border-radius: $uni-border-radius-sm;
}

.skeleton-text {
	@extend .skeleton;
	height: 14px;
	margin-bottom: $uni-spacing-sm;

	&:last-child {
		width: 60%;
	}
}

.skeleton-avatar {
	@extend .skeleton;
	width: $uni-img-size-avatar;
	height: $uni-img-size-avatar;
	border-radius: $uni-border-radius-circle;
}

.skeleton-card {
	@extend .skeleton;
	height: 120px;
	margin-bottom: $uni-spacing-md;
	border-radius: $uni-border-radius-lg;
}

/* ── Floating Action Button (FAB) ───────────────────────────── */
.fab {
	position: fixed;
	right: $uni-spacing-lg;
	bottom: calc(160rpx + env(safe-area-inset-bottom));
	width: 56px;
	height: 56px;
	border-radius: $uni-border-radius-circle;
	background: $brand-gradient;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: $uni-shadow-float;
	z-index: $uni-z-index-fixed;
	transition: $uni-transition-spring;

	&:active {
		transform: scale(0.9);
	}

	.fab-icon {
		font-size: 28px;
		color: $uni-text-color-inverse;
		font-weight: $uni-font-weight-bold;
	}
}

/* ── Input Field ────────────────────────────────────────────── */
.input-field {
	background-color: $uni-bg-color-input;
	border: 1.5px solid transparent;
	border-radius: $uni-border-radius-base;
	padding: $uni-spacing-md $uni-spacing-base;
	font-size: $uni-font-size-base;
	color: $uni-text-color;
	transition: $uni-transition-fast;

	&:focus,
	&.is-focus {
		border-color: $uni-color-primary;
		background-color: $uni-bg-color;
		box-shadow: 0 0 0 3px rgba(255, 122, 69, 0.10);
	}

	&::placeholder {
		color: $uni-text-color-placeholder;
	}
}

/* ── Page Container ─────────────────────────────────────────── */
.page-container {
	min-height: 100vh;
	background-color: $uni-bg-color-grey;
	padding-bottom: calc(env(safe-area-inset-bottom) + 20px);
}

/* ── Scrollbar hide (for scroll-view) ───────────────────────── */
::-webkit-scrollbar {
	display: none;
	width: 0;
	height: 0;
	color: transparent;
}

/* ── Hover / Press feedback ─────────────────────────────────── */
.pressable {
	transition: $uni-transition-fast;

	&:active {
		opacity: $uni-opacity-pressed;
		transform: scale(0.98);
	}
}

.hoverable {
	transition: $uni-transition-fast;

	&:active {
		background-color: $uni-bg-color-hover;
	}
}

/* ── Price Display ──────────────────────────────────────────── */
.price {
	color: $uni-color-primary;
	font-weight: $uni-font-weight-bold;
	font-family: 'DIN Alternate', $uni-font-family;

	.price-symbol {
		font-size: 0.7em;
		margin-right: 1px;
	}
}

.price-lg {
	font-size: $uni-font-size-xxl;
}

.price-sm {
	font-size: $uni-font-size-base;
}

/* ── Bottom Action Bar ──────────────────────────────────────── */
.bottom-bar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	background-color: $uni-bg-color;
	padding: $uni-spacing-md $uni-spacing-base;
	padding-bottom: calc(#{$uni-spacing-md} + env(safe-area-inset-bottom));
	box-shadow: 0 -2px 12px rgba(26, 26, 46, 0.06);
	z-index: $uni-z-index-fixed;
	display: flex;
	align-items: center;
	gap: $uni-spacing-md;
}

/* ── Empty placeholder spacer for bottom bar ────────────────── */
.bottom-bar-spacer {
	height: calc(80px + env(safe-area-inset-bottom));
}
</style>
