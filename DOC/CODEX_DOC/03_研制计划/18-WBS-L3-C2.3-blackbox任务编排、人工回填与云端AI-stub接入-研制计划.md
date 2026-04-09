# WBS L3：C2.3 blackbox 任务编排、人工回填与云端 AI stub 接入

## 1. 目标

把黑盒阶段从“人工脑内流程”升级为正式脚本化编排层，并在第一阶段同时打通：

1. `manual` provider 的人工回填流程
2. `cloud_stub` provider 的真实云端 AI 规划输出

## 2. 预期输出

1. `blackbox:prepare / run / collect / validate / preview` 命令
2. `manual` 与 `cloud_stub` provider 抽象
3. `workspace/blackbox_jobs/` 工作目录、日志和证据规则
4. blackbox 预览页与人工验收入口

## 3. 进入条件

1. `C2.1` 已固定 blackbox job 契约与过程留痕边界
2. `C2.2` 已明确 package/export 对 readiness 的 gate 方向

## 4. 关闭标准

1. request 可以自动生成至少一个 blackbox job
2. `manual` provider 与 `cloud_stub` provider 可以共用同一套 artifacts/evidence 契约
3. 缺少 API key、provider 返回失败或人工待回填时，job 状态与错误信息可被机器和人工同时理解
4. `workspace/preview/blackbox/index.html` 可以直观看到 job 状态、slot readiness 和产物缩略图
