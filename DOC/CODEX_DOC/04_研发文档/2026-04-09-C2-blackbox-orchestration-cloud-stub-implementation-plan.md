# Blackbox Orchestration and Cloud Stub Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first-phase blackbox orchestration framework so `request -> blackbox -> package -> export` becomes a formal, testable production line with `manual` and `cloud_stub` providers.

**Architecture:** Keep the request-driven pipeline filesystem-first. Add a dedicated `workspace/blackbox_jobs/` runtime layer, formalize job and provider contracts, and make package/export gates consume blackbox readiness instead of loose placeholder state. The first real AI provider is cloud-first and only promises planning artifacts plus evidence, not production-grade Spine components.

**Tech Stack:** Node.js ESM, filesystem JSON contracts, existing npm scripts, HTML preview generation, network-backed cloud provider stub

---

### Task 1: 固化 blackbox job 契约与目录骨架

**Files:**
- Create: `spec/contracts/blackbox_job.schema.json`
- Create: `spec/examples/blackbox_job.example.json`
- Create: `tools/validate_blackbox_job.mjs`
- Test: `tools/blackbox_pipeline.test.mjs`

- [ ] **Step 1: 写 blackbox job 最小失败测试**

Run: `node --test tools/blackbox_pipeline.test.mjs`
Expected: FAIL，因为 `validate_blackbox_job.mjs` 和 schema 尚不存在

- [ ] **Step 2: 定义 `blackbox_job_v1` schema 与 example**

要求字段：
- `schemaVersion`
- `jobId`
- `characterRequestId`
- `presentationId`
- `providerType`
- `providerName`
- `status`
- `requestedSlots`
- `requestedVariants`
- `createdAt`
- `updatedAt`
- `inputSnapshot`
- `outputs`
- `errors`

- [ ] **Step 3: 实现 `tools/validate_blackbox_job.mjs`**

要求：
- 支持单 job 目录和 jobs 根目录两种入口
- 缺少 `job.json` 或 `schemaVersion` 错误时失败
- `status` 不在允许集合时失败

- [ ] **Step 4: 运行定向测试转绿**

Run: `node --test tools/blackbox_pipeline.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add spec/contracts/blackbox_job.schema.json spec/examples/blackbox_job.example.json tools/validate_blackbox_job.mjs tools/blackbox_pipeline.test.mjs
git commit -m "feat: add blackbox job contract"
```

### Task 2: 实现 `blackbox:prepare` 与 job 工作目录冻结

**Files:**
- Create: `tools/build_blackbox_jobs.mjs`
- Modify: `package.json`
- Modify: `README.md`
- Test: `tools/blackbox_pipeline.test.mjs`

- [ ] **Step 1: 写 `blackbox:prepare` 失败测试**

覆盖行为：
- 从 `workspace/requests/` 生成 `workspace/blackbox_jobs/<jobId>/`
- 冻结 `input/` 输入副本
- 为每个 request 生成一个 job

- [ ] **Step 2: 实现最小 `build_blackbox_jobs.mjs`**

要求：
- jobId 可稳定由 `presentationId + timestamp` 或 `presentationId + requestId` 构成
- 写 `job.json`
- 拷贝 `request.json`、`art/`、`notes/`、`refs/` 到 `input/`
- 将状态置为 `prepared`

- [ ] **Step 3: 新增 npm script**

新增：
- `blackbox:prepare`
- `blackbox:validate`

- [ ] **Step 4: 跑定向测试**

Run: `node --test tools/blackbox_pipeline.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add tools/build_blackbox_jobs.mjs package.json README.md tools/blackbox_pipeline.test.mjs
git commit -m "feat: add blackbox prepare command"
```

### Task 3: 实现 provider 抽象、manual provider 与 cloud stub

**Files:**
- Create: `tools/lib/blackbox_providers.mjs`
- Create: `tools/run_blackbox_jobs.mjs`
- Create: `tools/lib/cloud_stub_provider.mjs`
- Create: `tools/lib/manual_provider.mjs`
- Test: `tools/blackbox_pipeline.test.mjs`

- [ ] **Step 1: 写 provider 分派失败测试**

覆盖行为：
- `manual` 可把 job 置为 `manual_pending`
- `cloud_stub` 可生成 `layer_plan.json / slot_map.json / variant_plan.json / provider_report.json`

- [ ] **Step 2: 实现 provider 抽象**

最小接口：
- `prepare(jobContext)`
- `run(jobContext)`
- `collect(jobContext)`

- [ ] **Step 3: 实现 `manual_provider`**

要求：
- 不调用外部 API
- 若 artifacts 不齐全，状态保持 `manual_pending`
- 若人工已放入标准 artifacts，可升级为 `manual_completed`

- [ ] **Step 4: 实现 `cloud_stub_provider`**

要求：
- 云端优先
- 第一阶段至少生成真实 AI 规划文件
- 若缺少 API key，job 要稳定失败并留下可读错误
- `provider_report.json` 必须记录模型名、耗时、是否命中真实云端

- [ ] **Step 5: 实现 `blackbox:run`**

Run: `node tools/run_blackbox_jobs.mjs workspace/blackbox_jobs`

- [ ] **Step 6: 跑定向测试**

Run: `node --test tools/blackbox_pipeline.test.mjs`
Expected: PASS

- [ ] **Step 7: 提交**

```bash
git add tools/lib/blackbox_providers.mjs tools/lib/cloud_stub_provider.mjs tools/lib/manual_provider.mjs tools/run_blackbox_jobs.mjs tools/blackbox_pipeline.test.mjs
git commit -m "feat: add blackbox providers and runner"
```

### Task 4: 实现 `blackbox:collect` 与 package 收口

**Files:**
- Create: `tools/collect_blackbox_results.mjs`
- Modify: `tools/build_request_package.mjs`
- Modify: `tools/validate_spine_package.mjs`
- Test: `tools/request_pipeline.test.mjs`
- Test: `tools/blackbox_pipeline.test.mjs`

- [ ] **Step 1: 写 package 收口失败测试**

覆盖行为：
- `descriptor.json` 必须写入 `blackboxJobId / readiness / providerType / providerName / evidenceFiles / reviewStatus`
- 缺失标准 artifacts 时不能把组件收口为 `ready`

- [ ] **Step 2: 实现 `blackbox:collect`**

要求：
- 只允许收口 `succeeded` 或 `manual_completed` job
- 将 `artifacts/components/<slot>` 映射到 `packages/<presentationId>/components/<slot>`
- 回填 descriptor 新字段

- [ ] **Step 3: 升级 package validator**

要求：
- 从旧 `status` 判断切换到 `readiness` 判断
- 强制校验 `blackboxJobId` 和 `evidenceFiles`

- [ ] **Step 4: 跑相关测试**

Run: `node --test tools/request_pipeline.test.mjs tools/blackbox_pipeline.test.mjs`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add tools/collect_blackbox_results.mjs tools/build_request_package.mjs tools/validate_spine_package.mjs tools/request_pipeline.test.mjs tools/blackbox_pipeline.test.mjs
git commit -m "feat: collect blackbox results into packages"
```

### Task 5: 实现 blackbox 预览、README 与验收样例

**Files:**
- Create: `tools/build_blackbox_preview.mjs`
- Modify: `package.json`
- Modify: `README.md`
- Modify: `workspace/requests/req_shieldmaiden_demo_v001/request.json`
- Test: `tools/blackbox_pipeline.test.mjs`

- [ ] **Step 1: 写预览失败测试**

覆盖行为：
- 生成 `workspace/preview/blackbox/index.html`
- 页面展示 job 状态、provider、slot readiness、产物缩略图、失败原因摘要

- [ ] **Step 2: 实现 `blackbox:preview`**

要求：
- 文案使用中文
- 样例页面能直观看到 `shieldmaiden_demo`

- [ ] **Step 3: README 增补黑盒主线入口**

新增：
- `npm run blackbox:prepare`
- `npm run blackbox:run`
- `npm run blackbox:collect`
- `npm run blackbox:validate`
- `npm run blackbox:preview`

- [ ] **Step 4: 跑整套验证**

Run:
- `node --test`
- `npm run blackbox:prepare`
- `npm run blackbox:run`
- `npm run blackbox:validate`
- `npm run blackbox:preview`

Expected:
- 测试全绿
- 预览页生成成功

- [ ] **Step 5: 提交**

```bash
git add tools/build_blackbox_preview.mjs package.json README.md workspace/requests/req_shieldmaiden_demo_v001/request.json tools/blackbox_pipeline.test.mjs
git commit -m "feat: add blackbox preview and acceptance flow"
```
