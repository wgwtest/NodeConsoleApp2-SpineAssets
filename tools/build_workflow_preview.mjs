import fs from 'node:fs/promises';
import path from 'node:path';

import {
  validateCharacterRequest,
  validateCharacterRequestCollection
} from './validate_character_request.mjs';
import {
  validateBlackboxJob,
  validateBlackboxJobCollection
} from './validate_blackbox_job.mjs';
import {
  validateSpinePackage,
  validateSpinePackageCollection
} from './validate_spine_package.mjs';
import {
  BLACKBOX_LAYER_PLAN_FILE,
  BLACKBOX_PROVIDER_REPORT_FILE,
  BLACKBOX_SLOT_MAP_FILE,
  BLACKBOX_VARIANT_PLAN_FILE,
  copyPreviewAsset,
  escapeHtml,
  isImageFile,
  pathExists,
  readJson,
  resolveArtifactFile
} from './lib/blackbox_shared.mjs';

async function readText(filePath) {
  return fs.readFile(filePath, 'utf8');
}

async function listFilesRecursive(rootDir, relativePrefix = '') {
  const entries = await fs.readdir(rootDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(rootDir, entry.name);
    const relativePath = path.posix.join(relativePrefix, entry.name);
    if (entry.isDirectory()) {
      files.push(...await listFilesRecursive(absolutePath, relativePath));
    } else {
      files.push(relativePath);
    }
  }

  return files.sort();
}

async function resolveRequestReports(requestsRoot) {
  const resolvedRoot = path.resolve(requestsRoot);
  const requestPath = path.join(resolvedRoot, 'request.json');
  if (await pathExists(requestPath)) {
    return [await validateCharacterRequest({ requestRoot: resolvedRoot })];
  }
  return validateCharacterRequestCollection({ requestsRoot: resolvedRoot });
}

async function resolveJobReports(jobsRoot) {
  const resolvedRoot = path.resolve(jobsRoot);
  const jobPath = path.join(resolvedRoot, 'job.json');
  if (await pathExists(jobPath)) {
    return [await validateBlackboxJob({ jobRoot: resolvedRoot })];
  }
  return validateBlackboxJobCollection({ jobsRoot: resolvedRoot });
}

async function resolvePackageReports(packagesRoot) {
  const resolvedRoot = path.resolve(packagesRoot);
  const packageManifestPath = path.join(resolvedRoot, 'package_manifest.json');
  if (await pathExists(packageManifestPath)) {
    return [await validateSpinePackage({ packageRoot: resolvedRoot, requireBlackboxReady: false })];
  }
  return validateSpinePackageCollection({
    packagesRoot: resolvedRoot,
    requireBlackboxReady: false
  });
}

async function resolveBundleCharacters(bundleRoot) {
  const resolvedRoot = path.resolve(bundleRoot);
  const bundleManifestPath = path.join(resolvedRoot, 'bundle_manifest.json');
  if (!await pathExists(bundleManifestPath)) {
    return {
      bundle: null,
      byPresentationId: new Map()
    };
  }

  const bundle = await readJson(bundleManifestPath);
  const byPresentationId = new Map();
  for (const item of bundle.characters ?? []) {
    const manifestRelativePath = item.characterManifest;
    const manifestPath = path.join(resolvedRoot, manifestRelativePath);
    if (!await pathExists(manifestPath)) {
      continue;
    }
    byPresentationId.set(item.presentationId, {
      presentationId: item.presentationId,
      relativePath: manifestRelativePath,
      manifest: await readJson(manifestPath)
    });
  }

  return {
    bundle,
    byPresentationId
  };
}

function prettyJson(value) {
  return JSON.stringify(value, null, 2);
}

function renderFileList(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return '<p class="muted">无</p>';
  }
  return `<ul>${items.map(item => `<li>${escapeHtml(item)}</li>`).join('\n')}</ul>`;
}

function renderCodePanels(panels) {
  return panels
    .map(panel => `
      <details class="code-panel" open>
        <summary>${escapeHtml(panel.label)}</summary>
        <pre><code>${escapeHtml(panel.content)}</code></pre>
      </details>
    `)
    .join('\n');
}

function renderImageCards(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return '<p class="muted">暂无图片。</p>';
  }

  return `
    <div class="visual-grid">
      ${items.map(item => `
        <article class="visual-card">
          <img src="./assets/${escapeHtml(item.assetName)}" alt="${escapeHtml(item.label)}" />
          <div class="visual-meta">
            <strong>${escapeHtml(item.label)}</strong>
            <span>${escapeHtml(item.caption)}</span>
          </div>
        </article>
      `).join('\n')}
    </div>
  `;
}

function renderStep(step) {
  return `
    <section class="step-card">
      <header class="step-header">
        <div>
          <p class="eyebrow">${escapeHtml(step.stepId)}</p>
          <h3>${escapeHtml(step.title)}</h3>
        </div>
        <span class="operation">${escapeHtml(step.operation)}</span>
      </header>
      <div class="io-grid">
        <div class="io-panel">
          <h4>input</h4>
          ${renderFileList(step.inputFiles)}
        </div>
        <div class="io-panel">
          <h4>output</h4>
          ${renderFileList(step.outputFiles)}
        </div>
      </div>
      ${step.images.length > 0 ? `<div class="panel"><h4>可视产物</h4>${renderImageCards(step.images)}</div>` : ''}
      <div class="panel">
        <h4>操作说明</h4>
        <p>${escapeHtml(step.description)}</p>
      </div>
      <div class="panel">
        <h4>数据展开</h4>
        ${renderCodePanels(step.codePanels)}
      </div>
    </section>
  `;
}

function buildPaperdollObject({
  request,
  job,
  packageReport,
  exportEntry,
  slotMap
}) {
  const slotMapBySlotName = new Map(
    (slotMap?.slots ?? []).map(slot => [slot.slotName, slot])
  );
  const characterManifest = exportEntry?.manifest ?? null;

  return {
    schemaVersion: 'workflow_paperdoll_object_v1',
    characterRequestId: request.characterRequestId,
    presentationId: request.presentationId,
    bundleTarget: request.bundleTarget,
    defaultVariantId: characterManifest?.defaultVariantId ?? packageReport.manifest.defaultVariantId,
    slots: (characterManifest?.slots ?? request.requiredSlots).map(slotName => {
      const mapped = slotMapBySlotName.get(slotName);
      const component = packageReport.components.find(item => item.slotName === slotName);
      return {
        slotName,
        componentId: mapped?.componentId ?? component?.componentId ?? `slot_${slotName}`,
        artifactFiles: component?.artifactFiles ?? [],
        readiness: component?.readiness ?? 'missing'
      };
    }),
    components: packageReport.components.map(component => ({
      componentId: component.componentId,
      slotName: component.slotName,
      readiness: component.readiness,
      reviewStatus: component.reviewStatus,
      artifactFiles: component.artifactFiles,
      evidenceFiles: component.evidenceFiles
    })),
    variants: (characterManifest?.variants ?? packageReport.variants).map(variant => ({
      variantId: variant.variantId,
      label: variant.label,
      skin: variant.skin,
      enabled: variant.enabled,
      requiredComponents: variant.requiredComponents ?? [],
      allowedAnimations: variant.allowedAnimations ?? [],
      notes: variant.notes ?? null
    })),
    runtimeAssets: {
      bundleId: exportEntry?.bundleId ?? null,
      characterManifest: exportEntry?.relativePath ?? null,
      skeletonFile: characterManifest?.skeletonFile ?? packageReport.manifest.skeletonFile,
      atlasFile: characterManifest?.atlasFile ?? packageReport.manifest.atlasFile,
      texturePages: characterManifest?.texturePages ?? packageReport.manifest.texturePages
    }
  };
}

async function buildRequestStep({ requestRoot, request, assetsRoot, prefix }) {
  const inputImages = [];
  const artDir = path.join(requestRoot, 'art');
  for (const entry of await fs.readdir(artDir)) {
    const relativePath = path.posix.join('art', entry);
    if (!isImageFile(relativePath)) {
      continue;
    }
    inputImages.push({
      label: entry,
      caption: '样例输入图',
      assetName: await copyPreviewAsset({
        sourceRoot: requestRoot,
        relativePath,
        assetsRoot,
        prefix
      })
    });
  }

  const noteFiles = await listFilesRecursive(path.join(requestRoot, 'notes'), 'notes');
  const refFiles = await listFilesRecursive(path.join(requestRoot, 'refs'), 'refs');
  const notePanels = await Promise.all(noteFiles.map(async relativePath => ({
    label: relativePath,
    content: await readText(path.join(requestRoot, relativePath))
  })));
  const refPanels = await Promise.all(refFiles.map(async relativePath => ({
    label: relativePath,
    content: await readText(path.join(requestRoot, relativePath))
  })));

  return {
    stepId: 'STEP_1',
    title: '步骤 1: 输入样例图与补充需求',
    operation: '人工补充样例需求 -> request.json / notes / refs',
    description: '把用户选定的样例图、补充描述和来源说明固定为 request 输入，作为后续 blackbox 和 package/export 的统一起点。',
    inputFiles: ['art/*', 'notes/*', 'refs/*'],
    outputFiles: ['request.json', ...noteFiles, ...refFiles],
    images: inputImages,
    codePanels: [
      {
        label: 'request.json',
        content: prettyJson(request)
      },
      ...notePanels,
      ...refPanels
    ]
  };
}

async function buildPrepareStep({ jobRoot, job }) {
  return {
    stepId: 'STEP_2',
    title: '步骤 2: Blackbox Prepare',
    operation: 'npm run blackbox:prepare -- cloud_stub openai_cloud_stub',
    description: '冻结 request 输入，生成 job.json 和 input 快照，让后续黑盒运行拥有稳定、可复现的输入边界。',
    inputFiles: ['request.json', ...job.inputSnapshot.artFiles, ...job.inputSnapshot.noteFiles, ...job.inputSnapshot.refFiles],
    outputFiles: ['job.json', job.inputSnapshot.requestJson, ...job.inputSnapshot.artFiles, ...job.inputSnapshot.noteFiles, ...job.inputSnapshot.refFiles],
    images: [],
    codePanels: [
      {
        label: 'job.json',
        content: prettyJson(job)
      }
    ]
  };
}

async function buildRunStep({ jobRoot, job, assetsRoot, prefix }) {
  const layerPlan = await readJson(path.join(jobRoot, job.outputs.layerPlanFile ?? BLACKBOX_LAYER_PLAN_FILE));
  const slotMap = await readJson(path.join(jobRoot, job.outputs.slotMapFile ?? BLACKBOX_SLOT_MAP_FILE));
  const variantPlan = await readJson(path.join(jobRoot, job.outputs.variantPlanFile ?? BLACKBOX_VARIANT_PLAN_FILE));
  const providerReport = await readJson(path.join(jobRoot, BLACKBOX_PROVIDER_REPORT_FILE));

  const images = [];
  for (const [slotName, artifactEntry] of Object.entries(job.outputs.componentArtifacts ?? {})) {
    const relativePath = resolveArtifactFile(artifactEntry);
    if (!relativePath || !isImageFile(relativePath)) {
      continue;
    }
    images.push({
      label: `slot_${slotName}`,
      caption: '组件产物',
      assetName: await copyPreviewAsset({
        sourceRoot: jobRoot,
        relativePath,
        assetsRoot,
        prefix
      })
    });
  }

  return {
    stepId: 'STEP_3',
    title: '步骤 3: Blackbox Run',
    operation: 'npm run blackbox:run -- cloud_stub openai_cloud_stub',
    description: '执行黑盒规划，输出 layer_plan / slot_map / variant_plan / provider_report，并产出每个 slot 的组件预览图。',
    inputFiles: ['job.json', ...job.inputSnapshot.artFiles],
    outputFiles: [
      job.outputs.layerPlanFile ?? BLACKBOX_LAYER_PLAN_FILE,
      job.outputs.slotMapFile ?? BLACKBOX_SLOT_MAP_FILE,
      job.outputs.variantPlanFile ?? BLACKBOX_VARIANT_PLAN_FILE,
      BLACKBOX_PROVIDER_REPORT_FILE,
      ...Object.values(job.outputs.componentArtifacts ?? {}).map(resolveArtifactFile).filter(Boolean)
    ],
    images,
    codePanels: [
      {
        label: 'layer_plan.json',
        content: prettyJson(layerPlan)
      },
      {
        label: 'slot_map.json',
        content: prettyJson(slotMap)
      },
      {
        label: 'variant_plan.json',
        content: prettyJson(variantPlan)
      },
      {
        label: 'provider_report.json',
        content: prettyJson(providerReport)
      }
    ],
    layerPlan,
    slotMap,
    variantPlan,
    providerReport
  };
}

async function buildCollectStep({ packageReport, assetsRoot, prefix }) {
  const descriptorPanels = packageReport.components.map(component => ({
    label: `${component.componentId}/descriptor.json`,
    content: prettyJson(component)
  }));
  const variantPanels = packageReport.variants.map(variant => ({
    label: `variants/${variant.variantId}/variant.json`,
    content: prettyJson(variant)
  }));

  const componentImages = [];
  for (const component of packageReport.components) {
    for (const artifactFile of component.artifactFiles.filter(isImageFile)) {
      componentImages.push({
        label: component.componentId,
        caption: `package 组件 ${component.slotName}`,
        assetName: await copyPreviewAsset({
          sourceRoot: packageReport.packageRoot,
          relativePath: artifactFile,
          assetsRoot,
          prefix
        })
      });
    }
  }

  return {
    stepId: 'STEP_4',
    title: '步骤 4: Package Collect',
    operation: 'npm run blackbox:collect',
    description: '把黑盒产物收口为 package 事实，回填组件 descriptor、variant manifest 和 request snapshot，形成正式的中间态装配包。',
    inputFiles: [
      'job artifacts/*',
      'source/request_snapshot.json'
    ],
    outputFiles: [
      'package_manifest.json',
      'source/request_snapshot.json',
      'components/*/descriptor.json',
      'variants/*/variant.json',
      'blackbox/layer_plan.json',
      'blackbox/slot_map.json',
      'blackbox/variant_plan.json'
    ],
    images: componentImages,
    codePanels: [
      {
        label: 'package_manifest.json',
        content: prettyJson(packageReport.manifest)
      },
      {
        label: 'source/request_snapshot.json',
        content: prettyJson(packageReport.requestSnapshot)
      },
      ...descriptorPanels,
      ...variantPanels
    ]
  };
}

async function buildExportStep({ bundle, exportEntry, assetsRoot, prefix }) {
  const primaryTexture = exportEntry.manifest.texturePages[0];
  const characterDir = path.dirname(path.join('', exportEntry.relativePath));
  const exportRoot = path.dirname(path.resolve(prefix)); // unused, replaced below by caller
  void exportRoot;
  return {
    stepId: 'STEP_5',
    title: '步骤 5: Export Bundle',
    operation: 'npm run exports:build',
    description: '把通过 blackbox/package 门槛的角色导出为主工程可消费的 bundle 与 character manifest。',
    inputFiles: [
      'package_manifest.json',
      'variants/*/variant.json',
      'components/*/descriptor.json'
    ],
    outputFiles: [
      'bundle_manifest.json',
      exportEntry.relativePath,
      ...exportEntry.manifest.texturePages,
      exportEntry.manifest.skeletonFile,
      exportEntry.manifest.atlasFile
    ],
    images: primaryTexture
      ? [{
          label: primaryTexture,
          caption: '最终导出纹理',
          assetName: await copyPreviewAsset({
            sourceRoot: exportEntry.characterRoot,
            relativePath: primaryTexture,
            assetsRoot,
            prefix
          })
        }]
      : [],
    codePanels: [
      {
        label: 'bundle_manifest.json',
        content: prettyJson(bundle)
      },
      {
        label: 'character_manifest.json',
        content: prettyJson(exportEntry.manifest)
      }
    ]
  };
}

function buildPaperdollStep({ paperdollObject }) {
  return {
    stepId: 'STEP_6',
    title: '步骤 6: Paperdoll Object',
    operation: 'derive paperdollObject from package + export',
    description: '从 package 组件目录和最终 character manifest 派生出一个运行时可读的纸娃娃对象快照，用来回答“有哪些 slot、组件、variant 和运行时资源”。',
    inputFiles: ['package_manifest.json', 'components/*/descriptor.json', 'character_manifest.json'],
    outputFiles: ['paperdollObject'],
    images: [],
    codePanels: [
      {
        label: 'paperdollObject',
        content: prettyJson(paperdollObject)
      }
    ]
  };
}

export async function buildWorkflowPreview({
  requestsRoot,
  jobsRoot,
  packagesRoot,
  bundleRoot,
  outputRoot
}) {
  if (!requestsRoot) throw new Error('缺少 requestsRoot');
  if (!jobsRoot) throw new Error('缺少 jobsRoot');
  if (!packagesRoot) throw new Error('缺少 packagesRoot');
  if (!bundleRoot) throw new Error('缺少 bundleRoot');
  if (!outputRoot) throw new Error('缺少 outputRoot');

  const resolvedOutputRoot = path.resolve(outputRoot);
  const assetsRoot = path.join(resolvedOutputRoot, 'assets');

  const requestReports = await resolveRequestReports(requestsRoot);
  const jobReports = await resolveJobReports(jobsRoot);
  const packageReports = await resolvePackageReports(packagesRoot);
  const { bundle, byPresentationId } = await resolveBundleCharacters(bundleRoot);

  const jobsByCharacterRequestId = new Map(jobReports.map(report => [report.characterRequestId, report]));
  const packagesByCharacterRequestId = new Map(
    packageReports.map(report => [report.manifest.characterRequestId, report])
  );

  await fs.rm(resolvedOutputRoot, { recursive: true, force: true });
  await fs.mkdir(assetsRoot, { recursive: true });

  const cases = [];
  const caseCards = [];

  for (const requestReport of requestReports) {
    const requestRoot = requestReport.requestRoot;
    const request = await readJson(path.join(requestRoot, 'request.json'));
    const jobReport = jobsByCharacterRequestId.get(request.characterRequestId) ?? null;
    const packageReport = packagesByCharacterRequestId.get(request.characterRequestId) ?? null;
    const exportEntryBase = byPresentationId.get(request.presentationId) ?? null;

    const jobRoot = jobReport?.jobRoot ?? null;
    const job = jobRoot ? await readJson(path.join(jobRoot, 'job.json')) : null;

    const exportEntry = exportEntryBase
      ? {
          ...exportEntryBase,
          bundleId: bundle?.bundleId ?? null,
          characterRoot: path.dirname(path.join(path.resolve(bundleRoot), exportEntryBase.relativePath))
        }
      : null;

    const stepPrefix = request.presentationId;
    const steps = [];
    steps.push(await buildRequestStep({
      requestRoot,
      request,
      assetsRoot,
      prefix: `${stepPrefix}-request`
    }));

    if (jobRoot && job) {
      steps.push(await buildPrepareStep({ jobRoot, job }));
      const runStep = await buildRunStep({
        jobRoot,
        job,
        assetsRoot,
        prefix: `${stepPrefix}-run`
      });
      steps.push(runStep);

      if (packageReport) {
        steps.push(await buildCollectStep({
          packageReport,
          assetsRoot,
          prefix: `${stepPrefix}-package`
        }));

        if (bundle && exportEntry) {
          steps.push(await buildExportStep({
            bundle,
            exportEntry,
            assetsRoot,
            prefix: `${stepPrefix}-export`
          }));

          const paperdollObject = buildPaperdollObject({
            request,
            job,
            packageReport,
            exportEntry,
            slotMap: runStep.slotMap
          });
          steps.push(buildPaperdollStep({ paperdollObject }));

          cases.push({
            characterRequestId: request.characterRequestId,
            presentationId: request.presentationId,
            bundleTarget: request.bundleTarget,
            steps: steps.map(step => ({
              stepId: step.stepId,
              title: step.title,
              operation: step.operation,
              inputFiles: step.inputFiles,
              outputFiles: step.outputFiles,
              description: step.description
            })),
            paperdollObject
          });

          caseCards.push(`
            <article class="case-card">
              <header class="case-header">
                <div>
                  <div class="eyebrow">全过程验收案例</div>
                  <h2>${escapeHtml(request.presentationId)}</h2>
                  <p>${escapeHtml(request.characterRequestId)}</p>
                </div>
                <span class="badge">${escapeHtml(request.bundleTarget)}</span>
              </header>
              <div class="case-stack">
                ${steps.map(renderStep).join('\n')}
              </div>
            </article>
          `);
        }
      }
    }
  }

  const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>全过程验收</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #132233;
        --muted: #5b6673;
        --line: rgba(19, 34, 51, 0.14);
        --card: rgba(255, 255, 255, 0.94);
        --accent: #1f5f7a;
        --accent-soft: #e2eff4;
        --warm: #c56c3d;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Noto Sans SC", "PingFang SC", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(31, 95, 122, 0.14) 0, transparent 28%),
          radial-gradient(circle at bottom right, rgba(197, 108, 61, 0.12) 0, transparent 26%),
          linear-gradient(180deg, #f7f1e8 0%, #ece6dd 100%);
      }
      main {
        max-width: 1320px;
        margin: 0 auto;
        padding: 42px 20px 72px;
      }
      .hero,
      .case-card,
      .step-card,
      .panel,
      .io-panel {
        border: 1px solid var(--line);
        border-radius: 24px;
        background: var(--card);
        box-shadow: 0 16px 36px rgba(19, 34, 51, 0.08);
      }
      .hero {
        padding: 28px;
        margin-bottom: 24px;
      }
      .hero h1 {
        margin: 0 0 10px;
        font-size: clamp(30px, 4vw, 48px);
        letter-spacing: -0.03em;
      }
      .hero p {
        margin: 0;
        color: var(--muted);
        line-height: 1.7;
      }
      .case-card {
        padding: 24px;
      }
      .case-header,
      .step-header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
      }
      .eyebrow {
        margin: 0;
        color: var(--accent);
        font-size: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-weight: 700;
      }
      .case-header h2,
      .step-header h3 {
        margin: 8px 0 6px;
      }
      .case-header p {
        margin: 0;
        color: var(--muted);
      }
      .badge,
      .operation {
        padding: 8px 12px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-size: 12px;
        line-height: 1.4;
      }
      .case-stack {
        display: grid;
        gap: 18px;
        margin-top: 20px;
      }
      .step-card {
        padding: 18px;
      }
      .io-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 14px;
        margin-top: 16px;
      }
      .io-panel,
      .panel {
        padding: 16px;
        margin-top: 16px;
      }
      .io-panel h4,
      .panel h4 {
        margin: 0 0 10px;
      }
      .visual-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 14px;
      }
      .visual-card {
        border-radius: 18px;
        overflow: hidden;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.88);
      }
      .visual-card img {
        width: 100%;
        height: 240px;
        object-fit: contain;
        background:
          linear-gradient(135deg, rgba(31, 95, 122, 0.08), rgba(197, 108, 61, 0.08));
      }
      .visual-meta {
        padding: 12px;
      }
      .visual-meta strong,
      .visual-meta span {
        display: block;
      }
      .visual-meta span,
      .muted {
        color: var(--muted);
      }
      ul {
        margin: 0;
        padding-left: 20px;
      }
      details summary {
        cursor: pointer;
        font-weight: 700;
        color: var(--accent);
      }
      pre {
        margin: 12px 0 0;
        padding: 14px;
        border-radius: 16px;
        overflow: auto;
        background: #112235;
        color: #e7eef5;
        font-size: 12px;
        line-height: 1.6;
      }
      @media (max-width: 820px) {
        .case-header,
        .step-header {
          flex-direction: column;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <h1>全过程验收</h1>
        <p>这个页面不是最终交付包的静态封面，而是把同一案例的输入样例图、补充需求、blackbox prepare、blackbox run、package collect、export bundle 和派生 paperdollObject 串成一条可人工验收的步骤链。每个步骤都直接展开 input、output 和原始数据。</p>
      </section>
      <section class="cases">
        ${caseCards.join('\n')}
      </section>
    </main>
  </body>
</html>`;

  const report = {
    generatedAt: new Date().toISOString(),
    bundleId: bundle?.bundleId ?? null,
    caseCount: cases.length,
    cases
  };

  await fs.writeFile(path.join(resolvedOutputRoot, 'index.html'), html, 'utf8');
  await fs.writeFile(path.join(resolvedOutputRoot, 'report.json'), JSON.stringify(report, null, 2), 'utf8');

  return {
    html,
    report
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const requestsRoot = process.argv[2] ?? path.resolve(process.cwd(), 'workspace', 'requests');
  const jobsRoot = process.argv[3] ?? path.resolve(process.cwd(), 'workspace', 'blackbox_jobs');
  const packagesRoot = process.argv[4] ?? path.resolve(process.cwd(), 'workspace', 'packages');
  const bundleRoot =
    process.argv[5] ?? path.resolve(process.cwd(), 'workspace', 'exports', 'request_driven_bundle');
  const outputRoot =
    process.argv[6] ?? path.resolve(process.cwd(), 'workspace', 'preview', 'workflow');
  const preview = await buildWorkflowPreview({
    requestsRoot,
    jobsRoot,
    packagesRoot,
    bundleRoot,
    outputRoot
  });
  console.log(`BUILD WORKFLOW PREVIEW OK cases=${preview.report.caseCount} output=${outputRoot}`);
}
