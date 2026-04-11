# WBS L2：3.1 输入接收

## 1. 目标

固化正式生产主线的输入边界，确保单角色请求目录可以稳定进入本仓库，并成为后续任务建档、拆件加工和导出的统一起点。

## 2. 子节点

1. `3.1.1 request 输入契约与请求目录规则`

## 3. 前置条件

1. `3` 已确认成为当前主线
2. `1.2` 的 `presentation_catalog / bundle_manifest / character_manifest` 基础契约已经存在
3. `2` 样本 bundle 可作为回归基线继续执行

## 4. 预期输出

1. `request.json` 的最小 schema 与样例
2. request validator
3. request -> package 基线生成入口
4. 最小 request-driven fixture 与自动测试

## 5. 关闭标准

1. 只看 `workspace/requests/` 契约即可理解正式生产线的输入
2. 缺失输入、错误目录结构和坏请求都能稳定报错并阻止后续流程
3. 请求目录能够成为后续任务建档和导出链的稳定起点
