# WBS L0：NodeConsoleApp2-SpineAssets 研发总纲

## 1. 总目标

建立独立的 `Spine` 素材制作工程，使其可以向 `NodeConsoleApp2` 稳定输出战斗展示素材产物。

## 2. WBS 主树

1. `阶段A`
   - `A1 项目底座与契约建立`
   - `A2 双仓库协作规则与交付接口`
2. `阶段B`
   - `B1 样本角色导入、Rig 与导出验证`
3. `阶段C`
   - `C1 request 输入契约、package 中间态与多 variant 交付规范`
   - `C1.1 character_request 与 package 中间态契约`
   - `C1.2 多 variant character_manifest 与 request-driven 生成校验链`
   - `C2 角色原画黑盒加工与组件化 package 完善`
   - `C2.1 request 到组件黑盒加工接口与过程留痕`
   - `C2.2 package 组件完备性校验与 variant 装配收口`
4. `阶段D`
   - `D1 主工程导入接入与 bundle 交付规范`

## 3. 节点依赖

1. `A1 -> A2 -> B1 -> C1 -> C2 -> D1`
2. `A1` 负责建立独立仓库和最小导入脚手架
3. `A2` 负责固定双仓库协作模式、接口归属和版本规则
4. `B1` 负责证明样本 bundle 契约和导出验证链可持续回归
5. `C1` 负责把正式生产主线固定为 `request -> package -> export`
6. `C2` 负责把 request 源素材到组件沉淀、variant 装配完备性和黑盒加工留痕正式化
7. `D1` 负责把正式导出物纳入主工程消费链

## 4. 当前活跃节点

1. `阶段C / C2`

## 5. 阶段关闭标准

1. `A1`
   - 独立仓库可运行
   - 输入输出契约成文
   - 同步脚手架能读取主工程真实目录
2. `A2`
   - 双仓库协作规则成文
   - `presentation_catalog / bundle_manifest / character_manifest` 版本规则成文
   - 两边仓库都有镜像协作文档和对应 issue / project 节点
3. `B1`
   - 至少一个玩家样本和一个敌人样本完成导入、Rig、导出、预览验证
4. `C1`
   - `request / package / export` 三层契约稳定
   - 同一 `presentationId` 下多 `variant` 的交付语义明确
   - request-driven 工具链可校验、可重复执行
5. `C2`
   - request 输入能在 package 内留下组件加工过程证据
   - variant 对组件的依赖可被机器判定为完整或不完整
   - 组件不完整时 package/export 会稳定拒绝导出
6. `D1`
   - 主工程能够按约定消费 bundle，且失败路径可诊断
