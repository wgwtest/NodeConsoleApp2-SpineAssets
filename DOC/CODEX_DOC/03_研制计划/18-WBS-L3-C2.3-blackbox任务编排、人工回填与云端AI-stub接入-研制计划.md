# WBS L2：3.2 任务建档

## 1. 目标

把输入阶段之后的第一步固定为正式脚本化建档层，让每次输入都先变成可冻结、可追踪、可回放的任务目录，再进入后续拆件加工。

## 2. 预期输出

1. `blackbox:prepare / validate / preview` 命令
2. `workspace/blackbox_jobs/` 工作目录、日志和证据规则
3. 输入快照、任务状态和任务回放入口
4. 任务建档阶段的预览页与人工验收入口

## 3. 进入条件

1. `3.1` 已固定输入目录契约
2. `3.3` 需要消费统一的任务目录

## 4. 关闭标准

1. request 可以自动生成至少一个任务目录
2. 缺少 API key、provider 返回失败或人工待回填时，任务状态与错误信息可被机器和人工同时理解
3. `workspace/preview/blackbox/index.html` 可以直观看到任务状态、slot readiness 和产物缩略图
