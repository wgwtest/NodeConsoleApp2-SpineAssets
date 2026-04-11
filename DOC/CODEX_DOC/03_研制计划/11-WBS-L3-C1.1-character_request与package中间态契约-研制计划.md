# WBS L3：3.1.1 request 输入契约与请求目录规则

## 1. 目标

固定正式输入目录 `workspace/requests/<characterRequestId>/` 的结构规则，以及请求目录进入本仓库后的最小校验与基线生成规则。

## 2. 预期输出

1. `character_request` schema 与 example
2. request validator
3. request -> package 基线生成器
4. 输入接收阶段的预览证据

## 3. 进入条件

1. `3.1` 已确认作为正式生产主线的输入步骤

## 4. 关闭标准

1. `request.json` 缺失关键字段时会被拒绝
2. 最小 fixture 可以通过 request 校验
3. request 目录可以生成最小 package 基线，并保留 `source/request_snapshot.json` 与源文件副本
4. 输入接收阶段可以生成可浏览的 HTML 预览页与结构化报告
