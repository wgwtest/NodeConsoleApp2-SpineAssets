# B1官方样本bundle验证链路

创建时间：2026-04-07

最后整理时间：2026-04-07

状态：`当前有效`

## 1. 目的

`B1` 的目标不是开始正式美术生产，而是用官方导出样本验证素材工程的最小交付闭环：

1. 获取官方导出物
2. 整理为本仓库样本目录
3. 生成 `bundle_manifest / character_manifest`
4. 执行 bundle 校验
5. 生成静态预览页与证据

本轮验证通过后，`C1` 可以在该 bundle 契约上继续建立主工程消费适配层。

## 2. 本轮样本

### 2.1 固定样本

本轮只使用两份官方导出样本：

1. 玩家样本：`Spineboy`
2. 敌人样本：`Raptor`

### 2.2 选择原则

选择这两个样本的原因：

1. 角色语义清晰，便于分别代表玩家样本与敌人样本
2. 资料来源稳定，适合作为可重建验证样本
3. 资源体量适中，适合当前阶段先验证交付链路

## 3. 范围与非目标

### 3.1 本轮必须交付

1. 一份可提交到仓库的最小官方样本 bundle
2. 一套可重复执行的官方样本下载与重建脚本
3. 一套样本 bundle 构建与校验脚本
4. 一个静态预览页
5. 一组 `B1` 证据文档

### 3.2 本轮明确不做

1. `.spine` 工程文件管理
2. 真正的 Rig 制作
3. 主工程导入适配
4. 浏览器内真实播放 `Spine` 动画
5. 大规模角色资产生产

原因是 `B1` 只验证交付契约与交付链条，不提前侵入 `C1` 的运行时消费实现。

## 4. 目录分层

本轮目录分为三层：

### 4.1 官方样本输入层

路径：

1. `workspace/samples/official/spineboy/`
2. `workspace/samples/official/raptor/`

职责：

1. 存放从官方来源整理后的原始导出物
2. 尽量保持接近上游资源形态，便于重建与核对

### 4.2 正式 bundle 输出层

路径：

1. `workspace/exports/b1_official_samples/`

职责：

1. 输出本工程契约下的标准 bundle
2. 作为后续 `C1` 主工程消费的样本输入

标准目录：

1. `workspace/exports/b1_official_samples/bundle_manifest.json`
2. `workspace/exports/b1_official_samples/characters/spineboy/`
3. `workspace/exports/b1_official_samples/characters/raptor/`

### 4.3 预览与证据层

路径：

1. `workspace/preview/b1_official_samples/`

职责：

1. 生成静态预览页
2. 存放校验摘要与截图证据
3. 为后续引入浏览器运行时预留扩展位

## 5. 脚本职责

本轮新增脚本按职责拆分，不与既有 `sync_game_catalog.mjs` 耦死：

1. `fetch_official_samples`
   - 从官方来源下载 `Spineboy` 与 `Raptor` 导出物
   - 整理到 `workspace/samples/official/`
2. `build_sample_bundle`
   - 从官方样本目录生成 `workspace/exports/b1_official_samples/`
   - 产出 `bundle_manifest.json` 与 `character_manifest.json`
3. `validate_sample_bundle`
   - 校验目录结构、manifest 内容、文件引用关系与命名规则
4. `build_preview`
   - 生成静态预览页与辅助证据

既有脚本：

1. `tools/sync_game_catalog.mjs`
   - 继续负责主工程目录同步
   - 不承担 `B1` 官方样本 bundle 组装职责

## 6. 命名与映射规则

### 6.1 对外交付 ID

本轮固定对外交付 ID：

1. `spineboy`
2. `raptor`

即使上游官方文件名包含 `-pro`、渲染变体或其它后缀，对外也统一折叠为稳定的 `presentationId`。

### 6.2 输入层允许保留上游命名

`workspace/samples/official/` 可以保留接近官方的原始文件名，但进入正式 bundle 后必须按契约语义重新整理。

### 6.3 正式 bundle 约束

正式 bundle 必须满足：

1. 角色目录名与 `presentationId` 一致
2. `character_manifest` 中的 `presentationId` 与目录名一致
3. `skeletonFile / atlasFile / texturePages` 使用角色目录内相对路径
4. 所有资源路径均可被 manifest 直接定位

## 7. 元数据来源

### 7.1 文件存在性

以下信息必须来自真实样本文件：

1. skeleton 文件
2. atlas 文件
3. texture pages

### 7.2 补充声明

如果当前阶段不解析二进制 `skel`，则以下信息允许来自仓库内可审计的样本声明：

1. `animations`
2. `slots`
3. `defaultSkin`
4. `anchorProfile`
5. `scaleProfile`

这样可以保证：

1. 文件引用链来自真实资源
2. 运行时可见契约来自明确、可审计的仓库声明
3. 本轮不会因二进制解析而阻断 `B1`

## 8. bundle 规则

本轮样本 bundle 固定规则：

1. `bundleId`：`b1_official_samples`
2. `bundleVersion`：从 `0.1.0` 起
3. `sourceCatalog.schemaVersion`：`presentation_catalog_v1`

这里的 `sourceCatalog` 表示当前样本 bundle 所遵循的上游目录契约版本，不表示 `Spineboy` 与 `Raptor` 必须来源于主工程真实角色目录。

## 9. 校验口径

本轮至少校验以下事实：

1. `bundle_manifest.json` 符合现有 schema
2. 每个 `character_manifest.json` 符合现有 schema
3. `bundle_manifest` 中声明的角色 manifest 全部存在
4. `character_manifest` 引用的 skeleton、atlas、png 全部存在
5. 角色目录名与 `presentationId` 一致
6. 关键文件命名与 manifest 声明一致
7. 预览页能够列出所有角色与校验状态

同时必须保留一组反例测试，至少覆盖：

1. manifest 缺失
2. 资源文件缺失
3. `presentationId` 与目录不一致

## 10. 预览页边界

本轮预览页只做静态展示，不接入 `Spine` runtime。

页面至少展示：

1. bundle 基本信息
2. 两个角色的 manifest 摘要
3. 资源文件列表
4. 校验结果
5. 后续运行时预留区

后续如果要升级到浏览器内实际播放 `Spine` 动画，应在 `C1` 或独立后续节点处理，而不是回写 `B1` 范围。

## 11. 实施顺序

本轮实施顺序固定为：

1. 获取官方样本并沉淀最小仓库样本
2. 生成正式 bundle
3. 建立自动校验
4. 生成静态预览与证据
5. 收口 README、自测报告、验收清单与会话交接

## 12. 通过标准

`B1` 通过应至少满足：

1. 仓库内存在可直接查看的最小官方样本
2. 删除 `workspace/samples/official/` 后可通过下载脚本重建
3. 可生成符合现有 schema 的样本 bundle
4. 校验脚本在正常样本上通过，在缺文件样本上失败
5. 可生成静态预览页并沉淀证据文档
6. 不引入 `.spine` 工程依赖，不提前耦合主工程运行时
