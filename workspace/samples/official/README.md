# B1 Official Samples

本目录存放 `B1` 阶段用于验证 bundle 交付链路的最小官方样本。

当前样本：

1. `spineboy`
   - 角色类型：`player sample`
   - 来源目录：`EsotericSoftware/spine-runtimes@4.2/examples/spineboy/export`
2. `raptor`
   - 角色类型：`enemy sample`
   - 来源目录：`EsotericSoftware/spine-runtimes@4.2/examples/raptor/export`

重建命令：

```bash
npm run samples:fetch
```

后续流程：

```bash
npm run samples:build
npm run samples:validate
npm run samples:preview
```

说明：

1. 本目录保留最小可审计样本，供离线查看和回归验证使用
2. 正式交付 bundle 产物输出到 `workspace/exports/b1_official_samples/`
3. 静态预览与截图证据输出到 `workspace/preview/b1_official_samples/`
