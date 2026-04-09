# WBS L3：C2.2 package 组件完备性校验与 variant 装配收口

## 1. 目标

把 `variant` 对组件的依赖从“描述性字段”升级为真正的装配门槛，使 package/export 工具链能够区分占位组件、加工中组件和可导出组件。

## 2. 预期输出

1. 组件完备性状态与最小字段约定
2. `variant.requiredComponents` 与组件目录之间的一致性校验
3. package/export 对不完整组件的拒绝规则与报告输出
4. `readiness / reviewStatus / evidenceFiles` 的导出门槛

## 3. 进入条件

1. `C2.1` 已定义组件加工留痕接口
2. `C1.2` 已固定多 `variant` 的导出与校验主线

## 4. 关闭标准

1. 缺失组件、组件加工未完成、组件 evidence 不完整或组件状态不允许导出时，package/export 会稳定失败
2. 同一 `presentationId` 下多个 `variant` 的组件覆盖关系可以被机器报告出来
3. 组件完备 package 通过后，正式 export 行为与 `C1` 主线保持兼容
