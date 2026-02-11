---
name: vue
description: Master Vue.js 3 for building modern, reactive web applications with Composition API, single-file components, and comprehensive ecosystem tools. Use this skill when developing SPAs, component libraries, building interactive UIs, implementing state management with Pinia, routing with Vue Router, or setting up Vue 3 projects with Vite and TypeScript.
---

# Vue.js 3 Development

Comprehensive guide to building modern web applications with Vue 3, covering Composition API, Single-File Components, Vue Router, Pinia state management, and Vite tooling.

## Overview

Vue.js 3 is a progressive JavaScript framework for building user interfaces. It combines:
- **Composition API** for better code organization and reusability
- **Reactive system** with automatic UI updates based on Proxy
- **Single-File Components** (.vue) for encapsulated component development
- **TypeScript-first** design with excellent type inference
- **Vite** for lightning-fast development and optimized builds

## When to Use This Skill

This skill should be used when:
- Building single-page applications (SPAs)
- Creating interactive user interfaces
- Developing component libraries
- Migrating from Vue 2 to Vue 3
- Setting up modern Vue projects with Vite
- Implementing complex state management with Pinia
- Building server-side rendered (SSR) applications with Nuxt
- Creating progressive web apps (PWAs)
- Developing enterprise-scale frontend applications
- Rapid prototyping and MVPs

## Core Workflow

### 1. Project Initialization

Initialize a new Vue 3 project using the official scaffolding tool:

```bash
# Using npm
npm create vue@latest my-project

# Using pnpm (recommended for speed)
pnpm create vue@latest my-project

# Follow prompts to select:
# ✅ TypeScript
# ✅ Vue Router
# ✅ Pinia (state management)
# ✅ Vitest (unit testing)
# ✅ Playwright (E2E testing)
# ✅ ESLint + Prettier
```

Then install dependencies and start development:

```bash
cd my-project
npm install
npm run dev
# → http://localhost:5173/
```

### 2. Component Development

Create components using the Composition API with `<script setup>`:

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

// Props with TypeScript
const props = defineProps<{
  title: string
  initialCount?: number
}>()

// Events
const emit = defineEmits<{
  update: [value: number]
}>()

// Reactive state
const count = ref(props.initialCount ?? 0)

// Computed properties
const doubled = computed(() => count.value * 2)

// Methods
function increment() {
  count.value++
  emit('update', count.value)
}
</script>

<template>
  <div class="counter">
    <h2>{{ title }}</h2>
    <p>Count: {{ count }}</p>
    <p>Doubled: {{ doubled }}</p>
    <button @click="increment">Increment</button>
  </div>
</template>

<style scoped>
.counter {
  padding: 1rem;
  border: 1px solid #ccc;
  border-radius: 4px;
}
</style>
```

### 3. State Management with Pinia

Create stores using Composition API style:

```typescript
// stores/counter.ts
import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useCounterStore = defineStore('counter', () => {
  // State
  const count = ref(0)
  
  // Getters
  const doubleCount = computed(() => count.value * 2)
  
  // Actions
  function increment() {
    count.value++
  }
  
  async function fetchData() {
    const response = await fetch('/api/data')
    // handle response
  }
  
  return { count, doubleCount, increment, fetchData }
})
```

Use in components:

```vue
<script setup lang="ts">
import { useCounterStore } from '@/stores/counter'
import { storeToRefs } from 'pinia'

const store = useCounterStore()
const { count, doubleCount } = storeToRefs(store)
const { increment } = store
</script>

<template>
  <div>
    <p>Count: {{ count }}</p>
    <p>Double: {{ doubleCount }}</p>
    <button @click="increment">+1</button>
  </div>
</template>
```

### 4. Routing with Vue Router

Define routes:

```typescript
// router/index.ts
import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: () => import('@/views/Home.vue')
    },
    {
      path: '/users/:id',
      name: 'user-detail',
      component: () => import('@/views/UserDetail.vue'),
      props: true
    },
    {
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFound.vue')
    }
  ]
})

// Navigation guard
router.beforeEach((to, from, next) => {
  const isAuthenticated = localStorage.getItem('token')
  if (to.meta.requiresAuth && !isAuthenticated) {
    next({ name: 'login' })
  } else {
    next()
  }
})

export default router
```

Use in components:

```vue
<script setup lang="ts">
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const userId = computed(() => route.params.id)

function navigateToUser(id: number) {
  router.push({ name: 'user-detail', params: { id } })
}
</script>

<template>
  <nav>
    <RouterLink to="/">Home</RouterLink>
    <RouterLink :to="{ name: 'user-detail', params: { id: 123 } }">
      User 123
    </RouterLink>
  </nav>
  
  <RouterView />
</template>
```

## Essential Patterns

### Pattern: Composables for Reusable Logic

Extract reusable logic into composables:

```typescript
// composables/useFetch.ts
import { ref } from 'vue'

export function useFetch<T>(url: string) {
  const data = ref<T | null>(null)
  const error = ref<Error | null>(null)
  const loading = ref(false)

  async function execute() {
    loading.value = true
    try {
      const response = await fetch(url)
      data.value = await response.json()
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }

  execute()
  return { data, error, loading, refetch: execute }
}

// Usage
<script setup lang="ts">
const { data, loading, error } = useFetch<User[]>('/api/users')
</script>
```

### Pattern: Component Communication

**Props and Events:**
```vue
<!-- Parent -->
<ChildComponent 
  :message="parentMessage"
  @update="handleUpdate"
/>

<!-- Child -->
<script setup lang="ts">
const props = defineProps<{ message: string }>()
const emit = defineEmits<{ update: [value: string] }>()

function sendUpdate() {
  emit('update', 'data from child')
}
</script>
```

**Provide/Inject:**
```vue
<!-- Ancestor -->
<script setup lang="ts">
import { provide } from 'vue'
provide('theme', 'dark')
</script>

<!-- Descendant -->
<script setup lang="ts">
import { inject } from 'vue'
const theme = inject('theme', 'light') // with default
</script>
```

### Pattern: Lifecycle Hooks

```vue
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

onMounted(() => {
  console.log('Component mounted')
  // Fetch data, set up listeners
})

onUnmounted(() => {
  console.log('Component unmounted')
  // Clean up listeners, timers
})
</script>
```

### Pattern: TypeScript Integration

```vue
<script setup lang="ts">
import { ref } from 'vue'

interface User {
  id: number
  name: string
  email: string
}

// Type-safe props with defaults
interface Props {
  title: string
  count?: number
  tags?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  count: 0,
  tags: () => []
})

// Type-safe refs
const users = ref<User[]>([])
const input = ref<HTMLInputElement | null>(null)

// Type-safe emits
const emit = defineEmits<{
  update: [id: number, value: string]
  delete: [id: number]
}>()
</script>
```

### Pattern: Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  },
  
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vue-vendor': ['vue', 'vue-router', 'pinia']
        }
      }
    }
  }
})
```

## Template Syntax Quick Reference

```vue
<template>
  <!-- Text interpolation -->
  <p>{{ message }}</p>
  
  <!-- Attribute binding -->
  <img :src="imageUrl" :alt="imageAlt">
  
  <!-- Class binding -->
  <div :class="{ active: isActive, 'text-danger': hasError }"></div>
  <div :class="[activeClass, errorClass]"></div>
  
  <!-- Style binding -->
  <div :style="{ color: activeColor, fontSize: fontSize + 'px' }"></div>
  
  <!-- Conditional rendering -->
  <div v-if="isVisible">Visible</div>
  <div v-else>Hidden</div>
  <div v-show="isVisible">Toggle display</div>
  
  <!-- List rendering -->
  <li v-for="item in items" :key="item.id">{{ item.text }}</li>
  
  <!-- Event handling -->
  <button @click="handleClick">Click</button>
  <button @click="handleClick($event, 'arg')">With args</button>
  <form @submit.prevent="handleSubmit">Submit</form>
  
  <!-- Two-way binding -->
  <input v-model="formData.name">
  <input v-model.trim="formData.email">
  <input v-model.number="age">
</template>
```

## Best Practices

### Development

1. **Use Composition API** - Better reusability and TypeScript support
2. **Use `<script setup>`** - Cleaner syntax and better performance
3. **Type everything** - Leverage TypeScript for fewer bugs
4. **Single responsibility** - One component does one thing well
5. **Extract composables** - Reuse logic across components
6. **Lazy load routes** - Use dynamic imports for code splitting
7. **Use Pinia over Vuex** - Simpler API, better TypeScript support

### Performance

1. **Use `shallowRef`** for large objects that don't need deep reactivity
2. **Use `computed`** to memoize expensive operations
3. **Use `v-show` vs `v-if`** - `v-show` for frequent toggles, `v-if` for rare ones
4. **Lazy load components** - Use `defineAsyncComponent()`
5. **Use `v-memo`** for expensive list items
6. **Lazy load images** - Add `loading="lazy"` attribute
7. **Always use `:key`** in `v-for` loops

### Project Structure

```
my-project/
├── public/             # Static assets
├── src/
│   ├── assets/         # Images, styles
│   ├── components/     # Reusable components
│   ├── composables/    # Reusable logic
│   ├── router/         # Vue Router config
│   ├── stores/         # Pinia stores
│   ├── views/          # Page components
│   ├── App.vue
│   └── main.ts
├── vite.config.ts
├── tsconfig.json
└── package.json
```

## Common Tasks

### Testing with Vitest

```typescript
// components/__tests__/Counter.spec.ts
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import Counter from '../Counter.vue'

describe('Counter', () => {
  it('renders properly', () => {
    const wrapper = mount(Counter, {
      props: { initialCount: 5 }
    })
    expect(wrapper.text()).toContain('5')
  })

  it('increments count when button is clicked', async () => {
    const wrapper = mount(Counter)
    await wrapper.find('button').trigger('click')
    expect(wrapper.vm.count).toBe(1)
  })
})
```

### API Integration

```typescript
// composables/useApi.ts
import { ref } from 'vue'
import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export function useApi<T>(url: string) {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<Error | null>(null)

  async function execute() {
    loading.value = true
    try {
      const response = await apiClient.get<T>(url)
      data.value = response.data
    } catch (e) {
      error.value = e as Error
    } finally {
      loading.value = false
    }
  }

  return { data, loading, error, execute }
}
```

## Resources

- **Official Docs**: https://vuejs.org/
- **Vue Router**: https://router.vuejs.org/
- **Pinia**: https://pinia.vuejs.org/
- **Vite**: https://vitejs.dev/
- **Vue DevTools**: https://devtools.vuejs.org/
- **VueUse** (composables): https://vueuse.org/
- **Awesome Vue**: https://github.com/vuejs/awesome-vue

## Popular UI Libraries

- **Element Plus** - Enterprise-grade components
- **Vuetify** - Material Design components
- **Naive UI** - TypeScript-friendly components
- **Ant Design Vue** - Ant Design for Vue
- **PrimeVue** - Rich component set
- **Quasar** - Full-featured framework (SPA, SSR, PWA, Mobile)

## Meta Frameworks

- **Nuxt 3** - Full-stack Vue framework with SSR/SSG
- **VitePress** - Static site generator for documentation
