import { inject, onMounted, onUnmounted } from 'vue'

export function useLayout(opts = {}) {
  const layout = inject('layout')
  onMounted(() => layout.set(opts))
  onUnmounted(() => layout.reset())
}
