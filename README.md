# 离线三次贝塞尔缓动曲线编辑器

Lit + TypeScript 的离线曲线编辑器，搭配 Compose 风格的 easing 服务为页面提供求值。
标准三次贝塞尔参数化，`y` 控制柄允许越过端点（回摆 / 超调），同一阈值在一个片段内
**最多被穿过三次**，水平切触与整段恒值也能正确反查。

## 运行

```bash
npm install
npm run dev      # 本地页面
npm test         # Vitest（31 个用例）
npm run build    # tsc 类型检查 + 生产构建
```

## 模型

- **关键帧**：2～20 个，时间为严格递增整数，数值任意有限数。
- **片段**：相邻两帧 + 两个控制点，`x1,x2 ∈ [0,1]`，`y1,y2 ∈ [-2,2]`
  （与 Compose `CubicBezierEasing` 一致，且放开了 y 不超调的隐含假设）。
- 片段内是标准三次贝塞尔 `P0=(0,0), P1=(x1,y1), P2=(x2,y2), P3=(1,1)`，
  归一化 `y` 再线性映射到两端数值：`value = v0 + (v1 - v0) · y(u)`。

## 求值算法（`src/easing/bezier.ts`）

- **游标（时间 → 值）**：时间先换算成片段内分数 `x`，再反求单调的 `x(u)`。
  `x1,x2 ∈ [0,1]` 时 `x'(u)` 的 Bernstein 系数非负 ⇒ `x(u)` 单调；
  实现为带护栏的牛顿迭代，端点导数为 0（如 `x1=1,x2=0`）时退回二分。
- **阈值（值 → 时刻）**：`y'(u)` 是二次函数，先求其两个根把 `[0,1]`
  切成至多三个单调子区间（每段至多穿越一次，故一段最多三交点）：
  - 子区间端点夹住根 → 按端点**符号**二分（方向无关，递减段同样正确）；
  - 驻点恰好落在阈值上 → 水平切触点；切触不变号、三重根会变号，都只返回一次；
  - 两端数值相等的片段整段恒等 → 返回**时间区间**而不是无限多个点。
- 时间换算用 `t = t0 + (t1-t0)·x(u)`（`u` 本身不是时间分数）。
- 跨片段结果统一去重（时间容差 1e-8）、排序，相邻恒值区间合并；
  二分 80 次，时间误差远小于要求的 1e-6。

## 服务与失效语义（`src/easing/curve.ts`）

- `EasingService` 持有当前 `CurveDocument`，对外提供：
  `valueAt / cursorAt / thresholdAt / easing(i) / export()`。
- `evaluate()` 按 revision 惰性缓存一份不可变 `CurveEvaluation`：
  **画布曲线、游标读数、阈值命中、导出 JSON 全部取自同一份求值结果**。
- 任意编辑（拖拽、表单、`edit/insert/remove`）都走“草稿 → 校验 → 整体替换”，
  revision 推进并使旧 `CurveEvaluation` 及所有旧 `Lookup` 立即 `valid=false`；
  非法编辑（时间不再递增、控制点越界等）回滚，revision 不变。
- `Easing` 接口对齐 Compose：`SegmentEasing.transform(fraction)` 先反求 `x(u)`
  再取 `y(u)`，`easings()` 为每个片段提供一个服务。

## 页面（`src/components/curve-editor.ts`）

SVG 画布：白色关键帧（可拖，时间吸附整数）、橙色控制柄（可拖，限幅 0~1 / -2~2）、
绿色游标、粉色阈值线与命中点（恒值段显示色带）；面板可精确改帧、增删帧、
看穿越时刻与 revision 状态、导出 JSON（离线 Blob 下载）。
