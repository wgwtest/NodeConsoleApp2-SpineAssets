# WBS L1：阶段C 角色请求目录驱动的Spine素材生产链

## 1. 目标

把本仓库正式主线固定为 `request -> package -> export`，使其不再依赖官方样本链叙事，而是能够接收单角色请求目录并产出正式交付包。

## 2. 子节点

1. `C1 request 输入契约、package 中间态与多 variant 交付规范`
2. `C2 角色原画黑盒加工与组件化 package 完善`

## 3. 前置条件

1. `A2` 已冻结双仓库接口归属和基础 manifest 契约
2. `B1` 可作为 bundle/manifest 回归验证基线继续复用

## 4. 预期输出

1. `character_request` 目录输入契约
2. `package` 中间态契约与目录规则
3. 支持同一 `presentationId` 下多 `variant` 的角色级交付模型
4. request-driven 导出与校验工具链
5. request 源素材到组件黑盒加工的接口与过程留痕
6. 组件完备性与 variant 装配约束

## 5. 关闭标准

1. `workspace/requests/`、`workspace/packages/`、`workspace/exports/` 的职责边界明确
2. 最小 request fixture 可以进入 package，并生成正式 export
3. `B1` 回归链不被破坏
4. 组件黑盒加工阶段能够在 package 内留痕，并形成后续装配约束
