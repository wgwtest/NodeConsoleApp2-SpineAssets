# WBS L3：C1.2 多 variant character_manifest 与 request-driven 生成校验链

## 1. 目标

把现有单角色 `character_manifest` 升级为支持同一 `presentationId` 下多个 `variant` 的正式结构，并建立从 package 到 export 的 request-driven 生成与校验链。

## 2. 预期输出

1. `spine_character_manifest_v2` schema 与 example
2. request-driven export builder
3. export validator
4. 覆盖多 variant、资源缺失和坏导出的自动测试

## 3. 进入条件

1. `C1.1` 已明确 request 与 package 的目录和字段边界

## 4. 关闭标准

1. 同一 `presentationId` 下至少两个 `variant` 可以进入同一份 `character_manifest`
2. 导出结果可被 export validator 接受
3. 失败路径可稳定定位到 request、package 或 export 层
