# WBS L2：C1 request 输入契约、package 中间态与多 variant 交付规范

## 1. 目标

固化正式生产主线的三层契约边界，确保单角色请求目录进入仓内标准中间态后，可以在同一 `presentationId` 下生成多个 `skin / variant` 并导出为正式交付物。

## 2. 子节点

1. `C1.1 character_request 与 package 中间态契约`
2. `C1.2 多 variant character_manifest 与 request-driven 生成校验链`

## 3. 前置条件

1. `阶段C` 已确认成为当前主线
2. `A2` 的 `presentation_catalog / bundle_manifest / character_manifest` v1 契约已经存在
3. `B1` 样本 bundle 可作为回归基线继续执行

## 4. 预期输出

1. `request.json` 和 `package_manifest.json / variant.json` 的最小 schema 与样例
2. `spine_character_manifest_v2` 的多 variant 表达能力
3. request validator、package validator、export builder / validator
4. 最小 request-driven fixture 与自动测试

## 5. 关闭标准

1. 只看 `request / package / export` 契约即可理解正式生产线输入与输出
2. 同一 `presentationId` 下多个 `variantId` 的调用语义明确
3. 缺失输入、错误中间态、坏导出物都能稳定报错并阻止交付
