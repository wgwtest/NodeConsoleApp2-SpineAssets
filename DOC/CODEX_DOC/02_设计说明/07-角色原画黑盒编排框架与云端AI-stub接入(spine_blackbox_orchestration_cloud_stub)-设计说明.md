# 角色原画黑盒编排框架与云端 AI stub 接入

## 1. 背景

`C1` 已完成最小 `request -> package -> export` 主线，但当前“原画到组件”的阶段仍然是隐含黑盒：

1. 缺少正式任务对象和运行态目录
2. 缺少 provider 抽象，无法稳定接入人工回填或云端 AI
3. 缺少 job 级别的证据链和失败恢复语义
4. `package/export` 仍主要围绕文件存在性，而不是围绕组件 readiness 与审查状态做 gate

这会导致后续无论接入 OpenAI、其他云端 API，还是未来迁移本地模型，都需要重写主线。

## 2. 目标

本设计的第一阶段目标不是直接解决“任意原画自动变成生产级 Spine”。

第一阶段只解决以下问题：

1. 把“黑盒加工”从口头流程升级为正式工程阶段
2. 让 `manual` 与 `cloud_stub` 共用同一套 job / artifact / evidence 契约
3. 让 `package` 与 `export` 对组件完备性具备硬 gate
4. 为后续接入更强 AI provider 或 Spine 模板绑定留出稳定接口

## 3. 非目标

第一阶段明确不承诺：

1. 生产级自动拆件质量
2. 自动生成最终可用的 Spine 骨骼与 mesh
3. 任意姿态、任意风格、任意遮挡下的高质量全自动组件产出
4. 主工程实时调用黑盒服务

## 4. 正式主流程

第一阶段主流程调整为：

1. `request -> blackbox:prepare`
2. `blackbox:run`
3. `blackbox:collect`
4. `packages:validate`
5. `exports:build`
6. `exports:validate`

其中：

1. `request`
   - 仍是主工程拷贝进来的正式输入
2. `blackbox`
   - 负责生成任务、调用 provider、沉淀证据、收口组件产物
3. `package`
   - 负责保存仓内标准中间态与组件 readiness
4. `export`
   - 只消费通过 gate 的 package

## 5. 目录设计

新增正式目录：

1. `workspace/blackbox_jobs/`
2. `workspace/blackbox_jobs/<jobId>/job.json`
3. `workspace/blackbox_jobs/<jobId>/input/`
4. `workspace/blackbox_jobs/<jobId>/artifacts/`
5. `workspace/blackbox_jobs/<jobId>/evidence/`
6. `workspace/blackbox_jobs/<jobId>/logs/`

目录职责：

1. `job.json`
   - job 元数据、状态、输入摘要、输出摘要、错误信息
2. `input/`
   - 本次任务冻结输入，避免运行过程中读到已变更 request
3. `artifacts/`
   - provider 标准化输出
4. `evidence/`
   - provider 报告、截图、调试信息、成本记录
5. `logs/`
   - 文本日志与运行事件

## 6. Blackbox Job 契约

建议新增 `blackbox_job_v1`。

最小字段：

1. `schemaVersion`
2. `jobId`
3. `characterRequestId`
4. `presentationId`
5. `providerType`
6. `providerName`
7. `status`
8. `requestedSlots`
9. `requestedVariants`
10. `createdAt`
11. `updatedAt`
12. `inputSnapshot`
13. `outputs`
14. `errors`

字段说明：

1. `providerType`
   - `manual` 或 `cloud_stub`
2. `status`
   - 见状态机定义
3. `inputSnapshot`
   - 记录本次任务绑定的 request 文件、摘要与哈希
4. `outputs`
   - 指向 `layer_plan / slot_map / variant_plan / components` 等结果
5. `errors`
   - 记录失败原因、provider 错误和人工处理建议

## 7. 状态机

状态固定为：

1. `created`
2. `prepared`
3. `submitted`
4. `running`
5. `succeeded`
6. `failed`
7. `cancelled`
8. `manual_pending`
9. `manual_completed`

语义约束：

1. `failed`
   - provider 执行失败或返回不可收口结果
2. `manual_pending`
   - 系统要求人工回填，不视为异常终态
3. `manual_completed`
   - 人工已经补齐 artifacts，可继续 collect
4. `succeeded`
   - provider 已输出完整标准文件，可直接 collect

允许被 `blackbox:collect` 收口的状态只有：

1. `succeeded`
2. `manual_completed`

## 8. Provider 抽象

第一阶段 provider 必须统一输出标准 artifacts，而不是直接输出最终 Spine。

统一产物：

1. `artifacts/layer_plan.json`
2. `artifacts/slot_map.json`
3. `artifacts/variant_plan.json`
4. `artifacts/components/<slot>/*.png`
5. `evidence/provider_report.json`

### 8.1 manual provider

职责：

1. 不调用外部 API
2. 允许人工把标准化结果直接放入 `artifacts/`
3. 把 `job.status` 从 `manual_pending` 升级为 `manual_completed`

### 8.2 cloud_stub provider

职责：

1. 使用云端多模态模型读取 request 原画、描述与 slot/variant 目标
2. 至少生成：
   - `layer_plan.json`
   - `slot_map.json`
   - `variant_plan.json`
   - `provider_report.json`
3. 可选生成组件 PNG；若未生成，则 job 仍可通过人工补件继续收口

第一阶段对 `cloud_stub` 的要求是“真实调用云端 AI，产出真实计划文件”，而不是“直接得到生产级组件图层”。

## 9. Package 收口契约

`workspace/packages/<presentationId>/components/<slot>/descriptor.json` 升级为以 readiness 为中心的字段集合。

新增或固定字段：

1. `blackboxJobId`
2. `providerType`
3. `providerName`
4. `readiness`
5. `reviewStatus`
6. `evidenceFiles`
7. `artifactFiles`

`readiness` 固定为：

1. `missing`
2. `draft`
3. `ready`

`reviewStatus` 固定为：

1. `unreviewed`
2. `approved`
3. `rejected`

推荐规则：

1. provider 只产出计划，不产出组件图时：
   - `readiness = draft`
2. 标准组件图和证据齐全，但未人工确认时：
   - `readiness = ready`
   - `reviewStatus = unreviewed`
3. 第一阶段是否允许 `unreviewed` 导出，由 `packages/export gate` 单独决定

## 10. Gate 规则

### 10.1 `blackbox:validate`

失败条件：

1. 缺 `job.json`
2. 缺 `provider_report.json`
3. 缺 `slot_map.json`
4. job 状态不在允许收口集合

### 10.2 `packages:validate`

失败条件：

1. 必需 slot 缺 `descriptor.json`
2. `blackboxJobId` 缺失
3. `readiness !== ready`
4. `artifactFiles` 为空
5. `evidenceFiles` 为空

### 10.3 `exports:build`

失败条件：

1. 某个 `variant.requiredComponents` 缺少 `ready` 组件
2. `reviewStatus` 不在允许导出集合
3. package 声明与组件事实不一致

## 11. 命令设计

新增命令建议：

1. `npm run blackbox:prepare`
2. `npm run blackbox:run`
3. `npm run blackbox:collect`
4. `npm run blackbox:validate`
5. `npm run blackbox:preview`

职责如下：

1. `blackbox:prepare`
   - 从 `request` 生成或更新 job
2. `blackbox:run`
   - 调用 `manual` 或 `cloud_stub`
3. `blackbox:collect`
   - 把 job artifacts 收口回 package
4. `blackbox:validate`
   - 校验 job 证据链与收口前置条件
5. `blackbox:preview`
   - 生成 job 级验收页

## 12. 预览与人工验收

新增黑盒预览页必须直接回答：

1. 当前有哪些 job
2. 每个 job 使用了哪个 provider
3. job 当前状态是什么
4. 哪些 slot 已经 ready，哪些仍是 draft 或 missing
5. provider 返回了哪些计划文件与组件缩略图
6. 当前失败原因或人工回填提示是什么

建议产物：

1. `workspace/preview/blackbox/index.html`
2. `workspace/preview/blackbox/report.json`
3. `workspace/preview/blackbox/assets/`

## 13. 分阶段推进建议

### 13.1 第一阶段

1. 落 `job` 契约与目录
2. 落 `manual` 与 `cloud_stub` provider 抽象
3. 落 `blackbox:prepare / run / validate / preview`
4. 落 package 收口字段与 gate

### 13.2 第二阶段

1. 让 `cloud_stub` 产出更可信的组件图
2. 增加遮挡补全和透明背景清理
3. 增加 variant 级资源覆盖

### 13.3 第三阶段

1. 对接 Spine 模板骨架绑定
2. 引入更强 provider 或本地模型
3. 推进自动化导出质量

## 14. 为什么选择该路线

这条路线的优势是：

1. 先稳定工程骨架，再迭代 AI 质量
2. 先把失败恢复与证据链做实，再追求自动化比例
3. 不把主流程绑死在单一 provider 上
4. 将来切换云端或本地模型时，不需要重写 `package/export` 主线
