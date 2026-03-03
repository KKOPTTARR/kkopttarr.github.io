"""
切割物品精灵表脚本
源图: 2048x2048, 6列×5行
输出: 256×320 (4:5竖向矩形)
"""
from PIL import Image
import os

ITEMS_ORDER = [
    "lighter",            "piranha",     "pearl",            "seaweed",          "jellyfish",      "revolver",
    "cutlass",            "grenade",     "repeater",         "pufferfish",       "darkwater-anglerfish", "pesky-pete",
    "turtle-shell",       "coral-armor", "coral",            "weather-glass",    "chum",           "diving-helmet",
    "submersible",        "pop-snappers","flintlock",        "blunderbuss",      "broadside-cannon","corsair-sloop",
    "hot-air-balloon",    "steam-ironclad","auto-turret",    "magnetic-shield",  "toxin-canister",
]

TIERS = [
    ("青铜物品.png", "bronze"),
    ("白银物品.png", "silver"),
    ("黄金物品.png", "gold"),
    ("钻石物品.png", "diamond"),
]

COLS = 6
ROWS = 5
OUT_W = 256
OUT_H = 320   # 4:5 竖向矩形

BASE_DIR = "/Users/linjiakang/Desktop/barzar"

def find_col_boundaries(img):
    """通过亮度谷值找列分割线，返回 7 个 x 坐标（6 列的左右边界）"""
    w, h = img.size
    col_brightness = []
    for x in range(w):
        total = 0
        for y in range(0, h, 16):
            p = img.getpixel((x, y))
            total += (p[0] + p[1] + p[2]) / 3
        col_brightness.append(total / (h // 16))

    avg = sum(col_brightness) / len(col_brightness)
    threshold = avg * 0.55

    valleys = []
    i = 0
    while i < len(col_brightness):
        if col_brightness[i] < threshold:
            j = i
            while j < len(col_brightness) and col_brightness[j] < threshold:
                j += 1
            valleys.append((i + j) // 2)
            i = j + 50
        else:
            i += 1
    return valleys


def find_row_boundaries(img, sample_x):
    """等分 5 行，返回 6 个 y 边界坐标"""
    h = img.size[1]
    return [round(i * h / ROWS) for i in range(ROWS + 1)]


def auto_trim(cell, threshold=26, max_trim=50):
    """从四边扫描，去除亮度低于 threshold 的纯暗边缘（精灵表外框/分隔线）。
    采样中间 50% 区域均值，避免被边角局部暗区误判。
    返回裁剪后的 PIL Image。"""
    w, h = cell.size

    def col_avg(x):
        pix = [cell.getpixel((x, y)) for y in range(h // 4, 3 * h // 4, 4)]
        return sum((p[0] + p[1] + p[2]) // 3 for p in pix) / len(pix)

    def row_avg(y):
        pix = [cell.getpixel((x, y)) for x in range(w // 4, 3 * w // 4, 4)]
        return sum((p[0] + p[1] + p[2]) // 3 for p in pix) / len(pix)

    left = 0
    for x in range(min(max_trim, w // 3)):
        if col_avg(x) > threshold:
            left = x
            break

    right = w
    for x in range(w - 1, max(w - max_trim - 1, w // 3 * 2), -1):
        if col_avg(x) > threshold:
            right = x + 1
            break

    top = 0
    for y in range(min(max_trim, h // 3)):
        if row_avg(y) > threshold:
            top = y
            break

    bottom = h
    for y in range(h - 1, max(h - max_trim - 1, h // 3 * 2), -1):
        if row_avg(y) > threshold:
            bottom = y + 1
            break

    # 安全检查：裁出的区域不能小于原始的 60%
    if (right - left) < w * 0.6 or (bottom - top) < h * 0.6:
        return cell
    return cell.crop((left, top, right, bottom))


for filename, tier in TIERS:
    src_path = os.path.join(BASE_DIR, "images", filename)
    img = Image.open(src_path).convert("RGBA")
    w, h = img.size
    print(f"\n=== {tier} ({w}x{h}) ===")

    # 列边界
    col_vals = find_col_boundaries(img)
    print(f"  列谷值: {col_vals}")
    if len(col_vals) >= 7:
        # 7 个谷值 → 最外两个是外边框，中间 5 个是列分割线
        # 第 0~5 列: col_vals[0]..col_vals[1], col_vals[1]..col_vals[2], ...
        x_bounds = col_vals[:7]
    else:
        # 回退：等分
        x_bounds = [round(i * w / COLS) for i in range(COLS + 1)]
        print(f"  [警告] 列谷值不足，使用等分: {x_bounds}")

    # 行边界：在每列中间采样
    mid_xs = [(x_bounds[c] + x_bounds[c + 1]) // 2 for c in range(COLS)]
    row_vals = find_row_boundaries(img, mid_xs)
    print(f"  行谷值: {row_vals}")
    if len(row_vals) >= 6:
        y_bounds = row_vals[:6]
    else:
        y_bounds = [round(i * h / ROWS) for i in range(ROWS + 1)]
        print(f"  [警告] 行谷值不足，使用等分: {y_bounds}")

    out_dir = os.path.join(BASE_DIR, "public", "items", tier)
    os.makedirs(out_dir, exist_ok=True)

    for idx, name in enumerate(ITEMS_ORDER):
        row = idx // COLS
        col = idx % COLS

        # 每列向内缩 2px 避免相邻卡框渗入（valley 中心到卡内容边缘约 2px）
        x1 = x_bounds[col]     + 2
        x2 = x_bounds[col + 1] - 2
        y1, y2 = y_bounds[row], y_bounds[row + 1]

        cell = auto_trim(img.crop((x1, y1, x2, y2)))

        resized = cell.resize((OUT_W, OUT_H), Image.LANCZOS)
        out_path = os.path.join(out_dir, f"{name}.webp")
        resized.save(out_path, "WEBP", quality=90)
        print(f"  [{col},{row}] {name}: ({x1},{y1})-({x2},{y2}) cell={cell.size} → {out_path}")

    print(f"  {tier} 完成，共 {len(ITEMS_ORDER)} 张")

print("\n全部完成！")
