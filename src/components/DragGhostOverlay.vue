<template>
  <Teleport to="body">
    <div v-if="dragState.active" class="drag-ghost"
      :style="{ left: dragState.ghostX+'px', top: dragState.ghostY+'px',
                width: dragState.ghostW+'px', height: dragState.ghostH+'px' }"
    >
      <ItemCard v-if="dragState.item" :item="dragState.item"
        :grid-col="0" :grid-row="0" :cell-size="58" :cell-gap="4"
        :is-enemy="false" :shop-mode="true"
        style="position:relative;width:100%;height:100%;left:0;top:0;" />
    </div>
  </Teleport>
</template>

<script setup>
import ItemCard  from './ItemCard.vue'
import { dragState } from '../composables/useDrag.js'
</script>
