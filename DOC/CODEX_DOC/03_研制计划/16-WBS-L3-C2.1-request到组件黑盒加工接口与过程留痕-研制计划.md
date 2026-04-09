# WBS L3：C2.1 request 到组件黑盒加工接口与过程留痕

## 1. 目标

把 request 输入目录中的原画、描述和参考资料，转换为本仓库内部可追踪的 blackbox job、组件加工工单与过程记录，使黑盒阶段具备可审计、可回放和可恢复的最小证据。

## 2. 预期输出

1. `workspace/blackbox_jobs/<jobId>/` 目录与 `job.json` 契约
2. blackbox job 状态机与输入快照规则
3. request 源文件到组件产物之间的 lineage 记录
4. package 侧 `components/<componentId>/descriptor.json` 与 job 的关联字段

## 3. 进入条件

1. `C1.1` 已固定 request 与 package 的目录边界
2. `source/request_snapshot.json` 已作为 request 拷贝基线存在

## 4. 关闭标准

1. request 内的原画和说明可以映射到至少一个 blackbox job
2. 每个组件目录都能追溯到对应的 `blackboxJobId`
3. 只看 job 和 package 留痕文件，就能知道哪些组件仍处于加工中、人工待回填或已经 ready
