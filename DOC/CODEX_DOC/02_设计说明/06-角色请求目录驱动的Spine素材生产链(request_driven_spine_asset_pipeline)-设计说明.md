# 角色请求目录驱动的Spine素材生产链

## 1. 调整背景

当前仓库已经完成：

1. `B1` 官方样本下载、bundle 组装、校验与静态预览
2. `presentation_catalog / bundle_manifest / character_manifest` 首版契约
3. 主工程消费样本 bundle 的验证链路

但这些能力仍然主要服务于“官方样本验证”，不等于本仓库的正式生产目标。

本轮调整后，`NodeConsoleApp2-SpineAssets` 的正式主流程不再是“从样本目录生成 bundle”，而是：

1. 从 `NodeConsoleApp2` 接收单角色请求目录
2. 在本仓库内完成原画拷贝后的后续加工
3. 在同一个 `presentationId` 下装配多个 `skin / variant`
4. 输出可直接被主工程战斗画面调用的正式功能包

`B1` 样本链继续保留，但职责调整为：

1. 样本来源真值校验
2. manifest / bundle 契约回归校验
3. 主工程消费兼容性的底线验证

它不再代表正式角色生产主线。

## 2. 目标循环

新的理想循环固定为：

1. `NodeConsoleApp2` 产生角色需求、原画、描述和补充设定
2. 主工程把这些输入拷贝为一个正式 `character_request` 目录
3. `NodeConsoleApp2-SpineAssets` 接收该目录，并在本仓库内部完成加工
4. 加工结果在本仓库内沉淀为可复用组件和装配中间态
5. 以同一个 `presentationId` 为主键，产出多个 `skin / variant`
6. 生成正式 `bundle_manifest / character_manifest / skeleton / atlas / texture`
7. `NodeConsoleApp2` 只按交付契约导入并调用，不读取本仓库内部中间态

该循环的核心边界：

1. `NodeConsoleApp2` 负责提出需求，不负责素材生产过程
2. `NodeConsoleApp2-SpineAssets` 负责素材加工与交付，不写回主工程玩法数据
3. “纸娃娃组件生成”当前允许是人工黑盒阶段，但只能存在于本仓库内部
4. 主工程永远只消费 `workspace/exports/` 中的正式导出物

## 3. 分层

本仓库正式分为四层：

1. `Request Intake`
   - 接收主工程拷贝进来的角色请求目录
2. `Production Package`
   - 保存组件、纸娃娃装配和变体定义等内部中间态
3. `Export Pipeline`
   - 从内部标准中间态生成正式 bundle
4. `Validation`
   - 校验 request、package、export 三层完整性

分层后的目录语义：

1. `workspace/requests/`
   - 正式输入目录
2. `workspace/packages/`
   - 仓内标准中间态
3. `workspace/exports/`
   - 主工程正式消费的交付物
4. `workspace/preview/`
   - 供人工验收的证据页与截图

## 4. Request 输入契约

正式输入单位固定为“一个角色一个目录”：

1. `workspace/requests/<characterRequestId>/request.json`
2. `workspace/requests/<characterRequestId>/art/`
3. `workspace/requests/<characterRequestId>/notes/`
4. `workspace/requests/<characterRequestId>/refs/`

约束如下：

1. `request.json` 是唯一必读入口
2. `art/` 存放从主工程拷贝进来的角色原画
3. `notes/` 存放动作说明、拆件说明、制作要求
4. `refs/` 存放补充设定、参考图和附加说明
5. 本仓库只消费已经拷贝进来的文件，不回头引用主工程原始路径

建议的 `request.json` 最小字段：

1. `schemaVersion`
2. `characterRequestId`
3. `presentationId`
4. `title`
5. `description`
6. `bundleTarget`
7. `variants[]`
8. `requiredActions[]`
9. `requiredSlots[]`

字段职责：

1. `characterRequestId`
   - 标识一次正式素材生产任务
2. `presentationId`
   - 角色在主工程调用侧的稳定标识
3. `bundleTarget`
   - 指定该角色最终要进入哪个 bundle
4. `variants[]`
   - 声明希望在同一 `presentationId` 下产出的多个变体
5. `requiredActions[]`
   - 指定交付时必须可调用的动作集合
6. `requiredSlots[]`
   - 指定交付时必须稳定存在的槽位集合

## 5. Package 中间态契约

正式生产主线不直接从 request 目录生成 exports，而是先落到仓内标准中间态：

1. `workspace/packages/<presentationId>/package_manifest.json`
2. `workspace/packages/<presentationId>/components/`
3. `workspace/packages/<presentationId>/variants/<variantId>/variant.json`
4. `workspace/packages/<presentationId>/spine/`

职责定义：

1. `package_manifest.json`
   - 描述该 `presentationId` 当前有哪些可装配组件、有哪些变体、哪些变体允许导出
2. `components/`
   - 保存纸娃娃组件、拆件结果或其他内部可复用部件
3. `variants/<variantId>/variant.json`
   - 描述某个变体的 skin、标签、装配要求、导出覆盖项
4. `spine/`
   - 保存与导出直接相关的 `Spine` 工作产物或其镜像

边界规则：

1. `packages/` 是仓内标准件，不对主工程暴露
2. 当前允许人工黑盒把 `request -> package`
3. 一旦进入 `package -> export`，必须脚本化、可验证、可重复执行

## 6. 多 Variant 交付契约

同一个 `character_request` 可以在同一个 `presentationId` 下产出多个 `skin / variant`。

因此正式生产线不再使用“单角色只对应一个默认 skin”的思路，而是升级为“角色级 manifest + 变体索引”。

### 6.1 角色级原则

1. `presentationId` 是角色级稳定 ID
2. `variantId` 是同一角色下的调用级细分 ID
3. 主工程调用语义变为：
   - `presentationId + variantId`

### 6.2 manifest 调整方向

正式生产线引入新的角色 manifest 结构，建议版本升级为：

1. `spine_character_manifest_v2`

角色级公共字段仍保留：

1. `schemaVersion`
2. `presentationId`
3. `skeletonFile`
4. `atlasFile`
5. `texturePages`
6. `animations`
7. `slots`
8. `anchorProfile`
9. `scaleProfile`
10. `defaultVariantId`

新增：

1. `variants[]`

每个 `variant` 的最小字段：

1. `variantId`
2. `label`
3. `skin`
4. `enabled`
5. `allowedAnimations`
6. `anchorProfileOverride`
7. `scaleProfileOverride`
8. `resourceOverrides`

说明：

1. 第一阶段默认假设多个 variant 共享同一份 skeleton / atlas / texture
2. `variant` 主要覆盖 `skin`、标签、可用动作集合和展示参数
3. 若未来出现特殊变体需要独立资源，则通过 `resourceOverrides` 扩展，而不是把它拆成新的 `presentationId`

### 6.3 bundle_manifest 处理

第一阶段可继续沿用 `spine_bundle_manifest_v1`：

1. `bundle_manifest` 仍然只负责列出角色和 manifest 路径
2. 多 variant 细节全部放在 `character_manifest` 中

若后续需要把变体级发布规则提升到 bundle 级，再评估是否升级 `spine_bundle_manifest` 版本。

## 7. 生成与校验职责

正式生产线新增三类工具：

1. `request validator`
   - 校验输入目录和 `request.json` 完整性
2. `package validator`
   - 校验中间态是否可导出
3. `export builder / validator`
   - 从 `packages/` 生成 `exports/`，并校验导出结果

失败策略：

1. 缺少 `request.json`、原画、动作说明时，请求目录校验失败
2. `variant` 引用了不存在的 skin 或组件时，中间态校验失败
3. 导出后缺少骨骼、atlas、贴图或 manifest 字段不完整时，export 校验失败
4. 任意校验失败都不允许把该角色标记为正式可交付

## 8. 与当前脚本的关系

现有脚本职责调整如下：

1. `tools/build_sample_bundle.mjs`
   - 保留为 `B1` 官方样本组装器
2. `tools/validate_sample_bundle.mjs`
   - 保留为 `B1` 样本 bundle 校验器
3. `tools/build_sample_preview.mjs`
   - 保留为 `B1` 样本证据页工具

新增正式生产线后：

1. 样本链继续存在，承担回归验证作用
2. 正式角色生产链必须另建新的 request-driven 工具，不直接在样本脚本上堆逻辑

## 9. 测试策略

后续测试分为两条线：

1. `B1 regression`
   - 确保样本 bundle 契约和历史验证链不被破坏
2. `request-driven pipeline`
   - 用最小 request fixture 覆盖正式生产主线

正式生产主线至少要有以下自动测试：

1. 单角色 request 目录可通过 request 校验
2. 同一个 `presentationId` 下两个 variant 可进入同一份 `character_manifest`
3. package 缺少必需 skin / 资源时会被拒绝导出
4. exports 目录生成后可通过 manifest 校验

## 10. 分阶段落地建议

建议按以下顺序实现：

1. 固化 `character_request` schema 与目录规则
2. 固化 `package_manifest` 与 `variant.json` 最小结构
3. 升级 `character_manifest` 为支持 `variants[]` 的正式结构
4. 新建 request-driven 导出脚本和校验脚本
5. 用最小 fixture 打通 `request -> package -> export`
6. 最后再逐步把人工黑盒的组件生成阶段脚本化

## 11. 当前不做

本轮设计明确不要求立即实现：

1. 基于 `png / jpeg` 的自动纸娃娃生成
2. 全自动组件拆分
3. 主工程消费侧的运行时接入

这些能力允许后续逐步补齐，但不影响当前先把正式生产主线契约化。
