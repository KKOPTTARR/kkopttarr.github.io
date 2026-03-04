import { ref } from 'vue'

// 模块级单例——任何组件都可直接导入，无需 prop 传递
export const bubbleItem = ref(null)  // { item, x, y }

export function showBubble(item, clientX, elTop) {
  if (bubbleItem.value?.item === item) {
    bubbleItem.value = null   // 再次点击同一物品：关闭
  } else {
    bubbleItem.value = { item, x: clientX, y: elTop }
  }
}

export function hideBubble() {
  bubbleItem.value = null
}
