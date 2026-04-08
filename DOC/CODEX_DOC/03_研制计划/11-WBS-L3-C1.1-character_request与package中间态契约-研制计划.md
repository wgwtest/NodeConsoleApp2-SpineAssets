# WBS L3：C1.1 character_request 与 package 中间态契约

## 1. 目标

固定正式输入目录 `workspace/requests/<characterRequestId>/` 的结构规则，以及 `workspace/packages/<presentationId>/` 的最小中间态契约、基线生成和中间态预览证据。

## 2. 预期输出

1. `character_request` schema 与 example
2. `spine_package_manifest` schema 与 example
3. `spine_variant_manifest` schema 与 example
4. request validator 与 package validator
5. request -> package 基线生成器
6. package 中间态预览页与报告输出

## 3. 进入条件

1. `C1` 已确认作为阶段 C 的执行包

## 4. 关闭标准

1. `request.json` 缺失关键字段时会被拒绝
2. `package_manifest / variant.json` 缺失变体或资源约束时会被拒绝
3. 最小 fixture 可以通过 request 与 package 两层校验
4. request 目录可以生成最小 package 基线，并保留 `source/request_snapshot.json` 与源文件副本
5. package 中间态可以生成可浏览的 HTML 预览页与结构化报告
