import rawItems from '../../config/items.json'

// ===== 物品图标路径 =====
export function getIconUrl(name_en) {
  const slug = name_en.toLowerCase().replace(/ /g, '-')
  return `${import.meta.env.BASE_URL}items/${slug}.webp`
}

// ===== 从 config/items.json 构建物品池 =====
// 自动将 tiers.Bronze 的值展开为顶层默认属性
export const ITEM_POOL = rawItems.map(item => ({
  ...item,
  tier: 'Bronze',
  ...item.tiers.Bronze,
}))

// ===== 判断是否可以放置 =====
// maxCols/maxRows 默认对应背包（2行×4列）；阵容由调用方传入动态值
export function canPlace(gridState, col, row, maxCols = 4, maxRows = 2) {
  if (row < 0 || row >= maxRows) return false
  if (col < 0 || col >= maxCols) return false
  return gridState[row]?.[col] === null
}

// ===== 根据 ID 查找物品 =====
export function findItem(id) {
  return ITEM_POOL.find(i => i.id === id) || null
}

