# NodeConsoleApp2-SpineAssets

`NodeConsoleApp2-SpineAssets` 是 `NodeConsoleApp2` 的独立素材制作工程。

它的职责不是实现战斗规则，而是承担以下工作：

1. 接收主工程拷贝进来的单角色 `character_request` 目录
2. 在本仓库内管理 `Spine` 素材加工与中间态
3. 装配同一 `presentationId` 下的多个 `skin / variant`
4. 预览、校验并输出供主工程消费的正式 `Spine bundle`

当前仓库是独立工程、独立 git，后续可以单独建立远端仓库并独立推进，不依赖主游戏仓库的提交流程。

## 当前阶段

当前仓库已完成：

1. `1` 工程底座与输入输出约定的最小基线
2. `2` 样本回归验证链路
3. `3.1` 输入接收的最小可用基线
4. `3.5` 交付包导出的最小可用基线
5. 首轮自测、验收清单和会话交接文档建立

当前活跃节点：

1. `3 / 3.2 任务建档`

当前阶段进展：

1. `3.1` 输入接收已经完成最小 `request -> package -> export` 基线、校验链与预览证据
2. 当前正在把 `3.2 任务建档`、`3.3 拆件加工`、`3.4 角色包收口` 和 `3.6 运行验收` 重构为一套统一的中文线性主流程

当前主线说明：

1. 正式生产主线按线性六步表达：
   - `3.1 输入接收`
   - `3.2 任务建档`
   - `3.3 拆件加工`
   - `3.4 角色包收口`
   - `3.5 交付包导出`
   - `3.6 运行验收`
2. `2` 样本回归验证继续保留，但只作为回归验证线
3. 主工程消费接入后移到 `4 / 4.1 主工程导入与交付规范`

推荐执行顺序：

```bash
npm run blackbox:prepare -- cloud_stub openai_cloud_stub
npm run blackbox:run -- cloud_stub openai_cloud_stub
npm run blackbox:validate
npm run blackbox:collect
npm run packages:validate
npm run packages:preview
npm run exports:build
npm run exports:validate
npm run exports:preview
```

## 快速开始

1. 复制配置模板：

```bash
cp config/source-project.example.json config/source-project.json
```

2. 执行主工程目录同步：

```bash
npm run sync:catalog
```

3. 产物会写到：

```text
workspace/imports/game_catalog.json
```

说明：

1. `config/source-project.json` 内的相对路径一律相对该配置文件所在目录解析
2. 默认样例会把主工程定位到 `../../NodeConsoleApp2/NodeConsoleApp2`

## 当前工作区语义

1. `workspace/requests/`
   - 正式输入目录，一个角色一个 `character_request`
2. `workspace/blackbox_jobs/`
   - blackbox 运行态 job、输入快照、证据和日志
3. `workspace/packages/`
   - 仓内标准中间态，不对主工程暴露
4. `workspace/exports/`
   - 主工程正式消费的交付物
5. `workspace/preview/`
   - 人工验收截图、HTML 证据页和结构化报告
5. `workspace/blackbox_jobs/`
   - 黑盒任务工作目录、证据与日志

## 3.1 输入接收与 3.2-3.4 中间加工命令

从 `workspace/requests/` 生成 blackbox job 工作目录：

```bash
npm run blackbox:prepare
```

校验当前 `blackbox_jobs` 根目录：

```bash
npm run blackbox:validate
```

执行 provider，生成 blackbox 计划文件、证据与组件图：

```bash
npm run blackbox:run
```

把 blackbox 结果收口回 package：

```bash
npm run blackbox:collect
```

生成黑盒任务预览页：

```bash
npm run blackbox:preview
```

云端 AI 可选环境变量：

```bash
export OPENAI_API_KEY=...
export OPENAI_BLACKBOX_MODEL=gpt-5.4-mini
export OPENAI_BASE_URL=https://api.openai.com/v1
```

NanoBanana 可选环境变量：

```bash
export NANO_BANANA_ENABLED=true
export NANO_BANANA_API_KEY=...
export NANO_BANANA_BASE_URL=https://nanoapi.poloai.top/v1
export NANO_BANANA_MODEL=gemini-2.5-flash-image
```

说明：

1. `blackbox:prepare` 对应 `3.2 任务建档`，会为每个 request 生成一个稳定 `jobId`
2. job 会冻结 `input/request.json` 与 `input/art|notes|refs`
3. 当前第一阶段默认 provider 是 `manual`
4. 需要走云端 stub 时，可以直接覆盖 prepare/run 的 provider：

```bash
npm run blackbox:prepare -- cloud_stub openai_cloud_stub
npm run blackbox:run -- cloud_stub openai_cloud_stub
```

5. `cloud_stub` 在未配置 `OPENAI_API_KEY` 时会稳定回退为离线 stub，并把回退信息写进 `provider_report.json`
6. 若已配置 `OPENAI_API_KEY`，则会优先尝试调用 OpenAI Responses API 获取真实规划 JSON；请求失败时 job 会明确标记为 `failed`
7. 默认不会调用图像生成接口；只有在显式设置 `NANO_BANANA_ENABLED=true` 后，才会按 slot 调用 NanoBanana 生成 `render.png`
8. 图像生成接口较贵，建议仅在你明确要产出真实组件图时开启；日常验证继续使用默认离线回退路径
9. `blackbox:run` 对应 `3.3 拆件加工`
10. `blackbox:collect` 对应 `3.4 角色包收口`，会把 `artifacts/variant_plan.json` 合并进 `workspace/packages/<presentationId>/variants/*/variant.json`，使拆件结果真正成为 package 装配事实

当前 blackbox 基线产物：

1. `workspace/blackbox_jobs/<jobId>/job.json`
2. `workspace/blackbox_jobs/<jobId>/input/`
3. `workspace/blackbox_jobs/<jobId>/artifacts/`
4. `workspace/blackbox_jobs/<jobId>/evidence/`
5. `workspace/blackbox_jobs/<jobId>/logs/`
6. `workspace/preview/blackbox/index.html`

从 `workspace/requests/` 生成最小 package 脚手架：

```bash
npm run packages:build
```

校验当前 `requests` 根目录：

```bash
npm run requests:validate
```

校验当前 `packages` 根目录：

```bash
npm run packages:validate
```

生成人工检查用的 package 中间态预览页：

```bash
npm run packages:preview
```

说明：

1. `packages:build` 会把 `workspace/requests/` 下的请求目录转换成最小可校验的 package 基线
2. `packages:build` 只生成 package 骨架与 `source/` 快照，不再直接把组件收口为 `ready`
3. `packages:validate` 默认执行严格校验，只接受已经过 `blackbox:collect` 收口、且组件 `readiness=ready` 的 package
4. `packages:preview` 会把 `workspace/packages/` 下的 package 中间态写成可浏览的 HTML 页面和结构化报告；即使仍在 `pending_blackbox` 阶段也可预览
5. 经过 `blackbox:collect` 后，package 内的 `variant.json` 会带上黑盒收口后的 `requiredComponents / notes / source.blackboxVariantPlan`
6. request 原画主纹理支持 `png / jpg / jpeg / webp`；若存在可识别的位图源文件，会直接沿用其扩展名作为 package 的首张 texture page
7. 这三个命令会遍历 `workspace/requests/` 或 `workspace/packages/` 下的子目录
8. 单目录调试时，也可以直接运行：

```bash
node tools/build_request_package.mjs workspace/requests/<characterRequestId> workspace/packages
node tools/validate_character_request.mjs workspace/requests/<characterRequestId>
node tools/validate_spine_package.mjs workspace/packages/<presentationId>
node tools/build_package_preview.mjs workspace/packages/<presentationId> workspace/preview/packages
```

当前 package 基线会额外产出：

1. `source/request_snapshot.json`
   - 记录 request 的最小元数据和拷贝进 package 的文件清单
2. `source/art/` `source/notes/` `source/refs/`
   - 保存从 request 拷贝进 package 的源文件副本
3. `components/slot_*`
   - 基于 `requiredSlots[]` 生成的组件目录，内部含 `descriptor.json` 记录 `status / sourceFiles / artifactFiles`

当前 package 预览产物：

1. `workspace/preview/packages/index.html`
2. `workspace/preview/packages/report.json`
3. `workspace/preview/packages/assets/`

## 3.5 交付包导出命令

从 `workspace/packages/` 生成正式 export bundle：

```bash
npm run exports:build
```

校验生成后的 request-driven bundle：

```bash
npm run exports:validate
```

生成 request-driven 预览页与报告：

```bash
npm run exports:preview
```

生成单页全过程验收模板：

```bash
npm run workflow:preview
```

说明：

1. 当前 baseline 会把 `workspace/packages/` 下的所有 package 组装进同一个 `request_driven_bundle`
2. `exports:build` 会校验每个 `variant.requiredComponents` 对应组件是否 `readiness=ready`，并要求 `reviewStatus` 位于允许导出集合
3. 导出的 `character_manifest.json` 会直接带出每个 variant 的 `requiredComponents / notes / resourceOverrides`
4. `exports:preview` 会把变体备注与组件需求一起展示出来，便于人工核对同一 `presentationId` 下多个 skin/variant 的装配差异
5. 单目录调试时，也可以直接运行：

```bash
node tools/build_request_bundle.mjs workspace/packages/<presentationId> workspace/exports/<bundleId> <bundleId>
node tools/validate_request_bundle.mjs workspace/exports/<bundleId>
node tools/build_request_preview.mjs workspace/exports/<bundleId> workspace/preview/<bundleId>
```

当前 request-driven 预览产物：

1. `workspace/preview/request_driven_bundle/index.html`
2. `workspace/preview/request_driven_bundle/report.json`
3. `workspace/preview/request_driven_bundle/assets/`

## 3.6 运行验收产物

当前全过程验收预览产物：

1. `workspace/preview/workflow/index.html`
2. `workspace/preview/workflow/report.json`
3. `workspace/preview/workflow/assets/`

说明：

1. `workflow:preview` 会把同一案例的 `输入接收 -> 任务建档 -> 拆件加工 -> 角色包收口 -> 交付包导出 -> 运行验收` 串成一个单页
2. 页面会直接展开关键输入/输出文件，包括 `request.json / job.json / layer_plan.json / slot_map.json / variant_plan.json / descriptor.json / character_manifest.json`
3. 最后一步的运行时对象是从 package 和 export 数据派生的运行时快照，用于人工验收，不代表已经接入战斗运行时

## 2 样本回归验证

执行完整 `2.1 官方样本导入、Rig 与导出验证`：

```bash
npm run samples:b1
```

该命令会顺序执行：

1. `npm run samples:fetch`
2. `npm run samples:build`
3. `npm run samples:validate`
4. `npm run samples:preview`

关键产物：

1. 官方样本目录：`workspace/samples/official/`
2. 正式样本 bundle：`workspace/exports/b1_official_samples/`
3. 静态预览页：`workspace/preview/b1_official_samples/index.html`
4. 预览截图证据：`workspace/preview/b1_official_samples/preview.png`

## 文档入口

1. [工程策略映射](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/00-本地工程策略映射.md)
2. [工程总体分析](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/01_需求分析/00-工程总体分析.md)
3. [总体设计](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/02_设计说明/01-独立素材工程总体设计(spine_assets_architecture)-设计说明.md)
4. [双仓库协作规则](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/02_设计说明/03-双仓库协作模式与接口变更规则(cross_repo_collaboration)-设计说明.md)
5. [Request-driven Spine 素材生产链设计](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/02_设计说明/06-角色请求目录驱动的Spine素材生产链(request_driven_spine_asset_pipeline)-设计说明.md)
6. [2 样本回归验证设计](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/02_设计说明/05-B1官方样本bundle验证链路(b1_official_sample_bundle_validation)-设计说明.md)
7. [3 正式生产主线实施计划](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/04_研发文档/2026-04-08-C1-request-driven-spine-production-implementation-plan.md)
8. [2 样本回归验证自测报告](/home/wgw/CodexProject/NodeConsoleApp2-SpineAssets/DOC/CODEX_DOC/05_测试文档/01_自测报告/2026-04-07-202540-B1-官方样本bundle验证链路-自测报告.md)

## 目录

- `DOC/CODEX_DOC/`
  - 正式文档
- `config/`
  - 本地源工程配置
- `spec/contracts/`
  - 输入输出契约 schema
- `tools/`
  - 同步与校验工具
- `workspace/requests/`
  - 主工程拷贝进来的正式角色请求目录
- `workspace/packages/`
  - 仓内标准中间态与装配产物
- `workspace/exports/`
  - 导出给主工程的 bundle
- `workspace/spine_projects/`
  - `Spine` 源工程工作区
- `workspace/preview/`
  - 预览产物
