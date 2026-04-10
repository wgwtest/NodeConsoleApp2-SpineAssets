# 原图可验收组件拆件与混合补全

## 1. 背景

当前仓库已经具备：

1. `request -> blackbox -> package -> export` 的正式目录与命令链
2. `cloud_stub` 规划文件、组件 descriptor、variant manifest、workflow 验收页
3. `presentationId` 下多 `skin / variant` 的装配与导出约束

但当前“原图 -> 组件”的核心能力仍然没有成立：

1. `offline_stub` 只是在每个 slot 下复制同一张原图
2. 页面虽然能展示流程，但不能证明“真的拆出了 head / body / weapon”
3. 当前 NanoBanana 分支只适合“按文本生成组件候选图”，并不等于“从给定原图精确拆件”

因此，本轮必须把“可见事实拆件”和“生成式补全”明确拆开，避免继续产出伪成功链路。

## 2. 目标

本轮目标不是一步到位解决“任意角色原画自动变成生产级 Spine”。

本轮只解决以下问题：

1. 让系统能够从单张角色原画中稳定产出“可人工验收”的 slot 组件
2. 把真实从原图抠出的可见区域和 AI 补出的遮挡区域分层保存
3. 让 blackbox / package / preview 都能表达“事实层”和“补全层”的区别
4. 让 workflow 页面对每个 slot 清楚展示输入、mask、overlay、组件图和置信度

## 3. 非目标

本轮明确不承诺：

1. 自动生成生产级骨骼、mesh、权重和最终 Spine 动画
2. 自动还原原画中不可见的完整身体结构真值
3. 任意遮挡、任意视角、任意风格下的高质量全自动补全
4. 把生成式候选图直接当作事实层组件导出

## 4. 基本原则

### 4.1 事实层优先

系统必须优先产出“从原图真实抠出来”的可见区域组件。

例如：

1. `slot_head.visible.png`
2. `slot_weapon.visible.png`
3. `slot_body.visible.png`

这些文件的语义是：

1. 只描述原图中真实可见的像素
2. 可以有遮挡、裁切和不完整
3. 允许不适合直接用于最终战斗运行，但必须适合人工验收

### 4.2 补全层独立

若某个 slot 需要补出被遮挡或缺失的部分，则补全结果只能作为候选层保存：

1. `slot_head.completed.png`
2. `slot_weapon.completed.png`
3. `slot_body.completed.png`

补全层的语义是：

1. 允许由图像编辑或生图模型生成
2. 不得冒充原图真值
3. 必须和事实层一起展示，由人工决定是否可继续装配

### 4.3 验收必须看见证据链

对每个 slot，系统必须至少能展示：

1. 原图
2. grounding 文本或 box
3. mask
4. overlay
5. visible component
6. completed component（如果存在）
7. 质量说明与置信度

只展示最终 `render.png` 不再算通过。

## 5. 正式架构

本轮在现有 `cloud_stub` 之上新增 `decompose_hybrid` 黑盒能力。

正式链路调整为：

1. `request -> blackbox:prepare`
2. `blackbox:run` 先做规划
3. `blackbox:run` 再做 slot grounding / segmentation
4. `blackbox:run` 可选做 completion candidate 生成
5. `blackbox:collect`
6. `packages:validate`
7. `exports:build`

其中 blackbox 内部分三层：

1. `Planning`
   - 继续使用现有多模态规划，输出 layer / slot / variant 规划
2. `Visible Decomposition`
   - 使用本地视觉链路，把原图中真实可见区域按 slot 抠出
3. `Completion Candidate`
   - 对被遮挡或缺失区域按 slot 生成候选补全图

## 6. 视觉链路设计

### 6.1 Planning 层

继续保留现有规划职责：

1. 判定本次请求有哪些 slot
2. 给每个 slot 产出 `componentId`
3. 给每个 slot 产出用于 grounding 的语义提示
4. 给每个 variant 产出 `requiredComponents`

新增要求：

1. 每个 layer 增加 `groundingPrompt`
2. 每个 layer 增加 `acceptanceNotes`

## 6.2 Visible Decomposition 层

推荐组合：

1. `Florence-2` 或同类 phrase grounding 模型
2. `SAM 2` 或同类 promptable segmentation 模型
3. `Pillow` 负责 alpha、裁切、padding、overlay 合成

该层职责：

1. 根据 `groundingPrompt` 找到 slot 对应区域
2. 生成 box / mask / overlay
3. 从原图抠出透明背景的可见组件
4. 生成 `decomposition_report.json`

若某个 slot 没找到足够可信的区域，则：

1. visible component 可以缺失
2. 必须在报告中记录失败原因
3. 不得伪造占位图冒充成功

## 6.3 Completion Candidate 层

completion provider 必须是可插拔的。

支持三种模式：

1. `disabled`
   - 仅做事实层 visible extraction
2. `manual`
   - 人工补件后再 collect
3. `image_edit`
   - 调用图像编辑或图像生成接口，生成 completion candidate

本层输出只能是候选补全：

1. 它依赖 planning 和 visible mask
2. 它不能覆盖事实层 visible 文件
3. 它必须在 preview 页面单独标记为“生成补全候选”

## 7. 目录与产物

### 7.1 blackbox job 新增产物

每个 job 在现有 `artifacts/` 下新增：

1. `artifacts/grounding.json`
2. `artifacts/decomposition_report.json`
3. `artifacts/masks/<slot>.png`
4. `artifacts/overlays/<slot>.png`
5. `artifacts/components_visible/<slot>.png`
6. `artifacts/components_completed/<slot>.png`（可选）

其中：

1. `grounding.json`
   - 记录 slot 文本提示、box、置信度
2. `decomposition_report.json`
   - 记录每个 slot 的 visible / completed 产物状态、失败原因和质量摘要
3. `masks/<slot>.png`
   - 透明或二值 mask
4. `overlays/<slot>.png`
   - 原图叠加 box / mask 的验收图
5. `components_visible/<slot>.png`
   - 从原图抠出的真实可见组件
6. `components_completed/<slot>.png`
   - 生成式补全候选图

### 7.2 package 收口

`workspace/packages/<presentationId>/components/<componentId>/` 新增：

1. `visible.png`
2. `completed.png`（可选）
3. `mask.png`
4. `overlay.png`
5. `descriptor.json`

`descriptor.json` 新增字段：

1. `extractionMode`
2. `sourceMaskFile`
3. `overlayFile`
4. `visibleArtifactFiles`
5. `completedArtifactFiles`
6. `decompositionConfidence`
7. `occlusionNotes`
8. `acceptanceStatus`

字段语义：

1. `extractionMode`
   - `visible_only` / `visible_plus_completed`
2. `acceptanceStatus`
   - `failed` / `draft` / `review_ready` / `approved`

## 8. Gate 规则

### 8.1 blackbox collect gate

允许收口到 package 的最小条件：

1. `layer_plan.json`
2. `slot_map.json`
3. `variant_plan.json`
4. `provider_report.json`
5. `decomposition_report.json`

若某个 required slot 没有 `visible component`：

1. descriptor 允许写入
2. 但 `acceptanceStatus` 必须不是 `review_ready`
3. 该角色不得进入 export

### 8.2 package / export gate

允许导出的最小条件调整为：

1. `requiredComponents` 全部存在
2. 每个 required component 至少有 `visibleArtifactFiles`
3. `acceptanceStatus` 在允许导出集合内
4. `reviewStatus` 在允许导出集合内

补全层不再是导出硬前置，但如果某个变体声明依赖 `completed` 组件，则必须显式 gate。

## 9. 验收页调整

`workflow:preview` 和 `blackbox:preview` 必须升级为按 slot 展示证据链。

每个 slot 卡片必须包含：

1. slotName
2. groundingPrompt
3. confidence
4. mask
5. overlay
6. visible component
7. completed component（如果存在）
8. acceptanceStatus
9. fail / warning notes

若当前 job 仍是 `offline_stub` 或占位拷贝，页面必须明确标记：

1. `未进行真实拆件`
2. `当前产物不满足 slot 验收`

## 10. Provider 策略

### 10.1 第一阶段默认策略

推荐默认策略：

1. `planning` 使用现有 OpenAI 响应式规划
2. `visible decomposition` 使用本地 Python 视觉工具链
3. `completion` 默认关闭

原因：

1. visible extraction 是事实层，必须尽量本地、可重复、可审计
2. completion 是假设层，应该是可插拔增强，而不是前提
3. 这样即使没有稳定图像编辑 API，也能先把“可验收拆件”做成

### 10.2 completion provider 预留

预留 provider：

1. `openai_image_edit`
2. `gemini_image_edit`
3. `nanobanana_image_edit`
4. `manual_completion`

但本轮不把任何单一 completion provider 设为硬依赖。

## 11. 环境策略

本机当前具备：

1. NVIDIA GPU
2. Python 3.12

因此本轮允许引入一个与 Node 主线并行的 Python 小环境，只负责：

1. grounding
2. segmentation
3. image postprocess

Node 仍然负责：

1. request / job / package / export 契约
2. provider 调度
3. preview 生成
4. gate 校验

## 12. 分阶段落成

### 12.1 Phase A

先落成“真实可见拆件”：

1. 生成 mask / overlay / visible component
2. 页面可直观看到每个 slot 是否拆准
3. package gate 基于 `visible` 生效

### 12.2 Phase B

再落成“候选补全”：

1. 有遮挡的 slot 生成 completed component
2. 页面比较 visible 与 completed
3. 再评估哪些 variant 允许依赖 completion

### 12.3 Phase C

最后才讨论与 Spine 模板绑定：

1. slot 锚点
2. skeleton 贴图装配
3. 变体资源覆盖

## 13. 结论

本轮的关键不是“让 AI 直接画出一张看起来不错的组件图”，而是：

1. 先把原图中真实存在的 slot 区域精确提取出来
2. 再把补全候选明确标成补全候选
3. 让系统从“伪成功 stub”切换到“可审计、可验收的组件拆件流水线”

只有这个边界建立起来，后续无论接 OpenAI、Gemini、NanoBanana，还是本地模型，整个工程才不会继续在错误语义上叠功能。
