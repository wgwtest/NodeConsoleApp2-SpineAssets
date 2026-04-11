# WBS L2：3.5 交付包导出

## 1. 目标

把 package 中间态导出为主工程可消费的正式交付包，并建立从 package 到 export 的生成与校验链。

## 2. 预期输出

1. `spine_character_manifest_v2` schema 与 example
2. request-driven export builder
3. export validator
4. 覆盖多 variant、资源缺失和坏导出的自动测试

## 3. 进入条件

1. `3.4` 已明确组件收口后的 package 目录和字段边界

## 4. 关闭标准

1. 同一 `presentationId` 下至少两个 `variant` 可以进入同一份 `character_manifest`
2. 导出结果可被 export validator 接受
3. 失败路径可稳定定位到 request、package 或 export 层
