# WBS L2：C2 角色原画黑盒加工与组件化 package 完善

## 1. 目标

把 `workspace/requests/<characterRequestId>/` 中的角色原画、描述和参考输入，正式衔接到 `workspace/packages/<presentationId>/components/` 的内部组件沉淀阶段，使“人工黑盒加工”不再只是口头约定，而是具备接口、留痕和完备性门槛。

## 2. 子节点

1. `C2.1 request 到组件黑盒加工接口与过程留痕`
2. `C2.2 package 组件完备性校验与 variant 装配收口`
3. `C2.3 blackbox 任务编排、人工回填与云端 AI stub 接入`

## 3. 前置条件

1. `C1` 已完成最小 `request -> package -> export` 主线
2. `package_manifest / variant.json / character_manifest` 已固定基础字段边界

## 4. 预期输出

1. 组件黑盒加工的接口文件和状态留痕规则
2. `components/` 目录下组件描述、来源和产出规则
3. 组件完备性与 `variant` 依赖约束
4. package 到 export 的“可导出”门槛从占位基线升级为组件完备基线
5. 可运行的 blackbox job 框架、preview 和云端 provider stub

## 5. 关闭标准

1. 任一 request 的原画输入都能在 package 内留下组件加工过程证据
2. 每个 `variant` 所需组件都可被机器判定为完整或不完整
3. 组件不完整时 package/export 会稳定拒绝导出
4. 组件完整的 package 可继续进入正式 export 与预览链
5. 黑盒阶段具备 `manual` 与 `cloud_stub` 两类 provider 接口，且至少一个真实云端 stub 可写出标准 artifacts
