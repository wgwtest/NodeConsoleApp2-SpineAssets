# WBS L3：3.3.1 原图拆件与过程留痕

## 1. 目标

把 request 输入目录中的原画、描述和参考资料，转换为本仓库内部可追踪的拆件记录、组件加工工单与过程记录，使拆件阶段具备可审计、可回放和可恢复的最小证据。

## 2. 预期输出

1. request 源文件到组件产物之间的 lineage 记录
2. `components/<componentId>/descriptor.json` 与任务目录的关联字段
3. 拆件阶段的证据图和过程记录

## 3. 进入条件

1. `3.1.1` 已固定 request 与 package 的目录边界
2. `source/request_snapshot.json` 已作为 request 拷贝基线存在

## 4. 关闭标准

1. request 内的原画和说明可以映射到至少一组拆件任务
2. 每个组件目录都能追溯到对应的任务记录
3. 只看任务记录和 package 留痕文件，就能知道哪些组件仍处于加工中、人工待回填或已经 ready
