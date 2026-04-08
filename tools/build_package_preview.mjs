import fs from 'node:fs/promises';
import path from 'node:path';

import { validateSpinePackage, validateSpinePackageCollection } from './validate_spine_package.mjs';

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

async function resolvePackageReports(packagesRoot) {
  const resolvedRoot = path.resolve(packagesRoot);
  const packageManifestPath = path.join(resolvedRoot, 'package_manifest.json');

  try {
    await fs.access(packageManifestPath);
    return [await validateSpinePackage({ packageRoot: resolvedRoot })];
  } catch {
    return validateSpinePackageCollection({ packagesRoot: resolvedRoot });
  }
}

function renderListItems(items) {
  return items.map(item => `<li>${escapeHtml(item)}</li>`).join('\n');
}

function translateComponentStatus(status) {
  switch (status) {
    case 'ready':
      return '已就绪';
    case 'pending_blackbox':
      return '待黑盒加工';
    default:
      return status;
  }
}

function isImageFile(filePath) {
  return ['.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(filePath).toLowerCase());
}

function buildPreviewAssetName(presentationId, relativePath) {
  return `${presentationId}--${relativePath.replaceAll('/', '--')}`;
}

async function copyPreviewAsset({ packageRoot, relativePath, assetsRoot, presentationId }) {
  const assetName = buildPreviewAssetName(presentationId, relativePath);
  await fs.copyFile(path.join(packageRoot, relativePath), path.join(assetsRoot, assetName));
  return assetName;
}

function renderImageGallery(title, items) {
  if (items.length === 0) {
    return '';
  }

  return `
    <section class="panel">
      <h3>${escapeHtml(title)}</h3>
      <div class="visual-grid">
        ${items.map(item => `
          <article class="visual-card">
            <img src="./assets/${escapeHtml(item.assetName)}" alt="${escapeHtml(item.label)}" />
            <div class="visual-meta">
              <strong>${escapeHtml(item.label)}</strong>
              ${item.caption ? `<span>${escapeHtml(item.caption)}</span>` : ''}
            </div>
          </article>
        `).join('\n')}
      </div>
    </section>
  `;
}

function renderComponentItems(components, visualAssets) {
  if (visualAssets.length > 0) {
    return `
      <div class="visual-grid">
        ${visualAssets.map(item => `
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

  return `<ul>${components
    .map(component => (
      `<li><strong>${escapeHtml(component.componentId)}</strong> <span>${escapeHtml(translateComponentStatus(component.status))}</span></li>`
    ))
    .join('\n')}</ul>`;
}

export async function buildPackagePreview({
  packagesRoot,
  outputRoot
}) {
  if (!packagesRoot) {
    throw new Error('缺少 packagesRoot');
  }
  if (!outputRoot) {
    throw new Error('缺少 outputRoot');
  }

  const resolvedOutputRoot = path.resolve(outputRoot);
  const assetsRoot = path.join(resolvedOutputRoot, 'assets');
  const reports = await resolvePackageReports(packagesRoot);

  await fs.rm(resolvedOutputRoot, { recursive: true, force: true });
  await fs.mkdir(assetsRoot, { recursive: true });

  const cards = [];
  const reportPackages = [];

  for (const report of reports) {
    const { packageRoot, manifest, requestSnapshot, components, variants, presentationId } = report;
    const spineRoot = path.join(packageRoot, manifest.spineDir);
    const sourceRoot = path.join(packageRoot, manifest.sourceRequestDir);

    const primaryTexture = manifest.texturePages[0];
    await fs.copyFile(
      path.join(spineRoot, primaryTexture),
      path.join(assetsRoot, primaryTexture)
    );

    const requestArtImages = [];
    for (const relativePath of requestSnapshot.artFiles.filter(isImageFile)) {
      requestArtImages.push({
        label: path.basename(relativePath),
        caption: '请求原画',
        assetName: await copyPreviewAsset({
          packageRoot: sourceRoot,
          relativePath,
          assetsRoot,
          presentationId
        })
      });
    }

    const componentVisuals = [];
    for (const component of components) {
      const firstArtifact = component.artifactFiles.find(isImageFile);
      if (!firstArtifact) {
        continue;
      }
      componentVisuals.push({
        label: component.componentId,
        caption: `槽位 ${component.slotName} · ${translateComponentStatus(component.status)}`,
        assetName: await copyPreviewAsset({
          packageRoot,
          relativePath: firstArtifact,
          assetsRoot,
          presentationId
        })
      });
    }

    reportPackages.push({
      presentationId,
      manifest,
      requestSnapshot,
      components,
      requestArtImages,
      componentVisuals,
      variants
    });

    cards.push(`
      <article class="card">
        <header class="card-header">
          <div>
            <div class="eyebrow">中间态包</div>
            <h2>${escapeHtml(presentationId)}</h2>
          </div>
          <span class="status">已校验</span>
        </header>
        <div class="texture-frame">
          <img src="./assets/${escapeHtml(primaryTexture)}" alt="${escapeHtml(presentationId)} 纹理预览" />
          <div class="texture-overlay">
            <span>目标包</span>
            <strong>${escapeHtml(manifest.bundleTarget)}</strong>
          </div>
        </div>
        <section class="grid-2">
          <div class="panel">
            <h3>请求快照</h3>
            <ul>${renderListItems([
              ...requestSnapshot.artFiles,
              ...requestSnapshot.noteFiles,
              ...requestSnapshot.refFiles
            ])}</ul>
          </div>
          <div class="panel">
            <h3>组件</h3>
            ${renderComponentItems(components, componentVisuals)}
          </div>
        </section>
        ${renderImageGallery('源原画', requestArtImages)}
        <section class="panel">
          <h3>变体</h3>
          <ul class="chip-list">
            ${variants.map(variant => `<li class="chip"><strong>${escapeHtml(variant.variantId)}</strong><span>${escapeHtml(variant.skin)}</span></li>`).join('\n')}
          </ul>
        </section>
      </article>
    `);
  }

  const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>中间态预览</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #152130;
        --muted: #5f6b78;
        --line: #d4d0c8;
        --card: rgba(255,255,255,0.92);
        --accent: #355c7d;
        --accent-soft: #e7eff7;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Noto Sans SC", "PingFang SC", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(53, 92, 125, 0.12) 0, transparent 30%),
          linear-gradient(180deg, #f7f3ed 0%, #efebe2 100%);
      }
      main {
        max-width: 1180px;
        margin: 0 auto;
        padding: 48px 20px 72px;
      }
      .hero {
        margin-bottom: 28px;
        padding: 28px;
        border: 1px solid var(--line);
        border-radius: 24px;
        background: var(--card);
        box-shadow: 0 16px 32px rgba(21, 33, 48, 0.08);
      }
      .hero h1 {
        margin: 0 0 10px;
        font-size: 36px;
      }
      .hero p {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
        gap: 20px;
      }
      .card {
        padding: 20px;
        border: 1px solid var(--line);
        border-radius: 24px;
        background: var(--card);
        box-shadow: 0 16px 32px rgba(21, 33, 48, 0.08);
      }
      .card-header {
        display: flex;
        justify-content: space-between;
        gap: 12px;
      }
      .eyebrow {
        color: var(--accent);
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .status {
        padding: 6px 10px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-size: 12px;
      }
      .texture-frame {
        position: relative;
        min-height: 180px;
        margin: 16px 0;
        border-radius: 20px;
        overflow: hidden;
        border: 1px solid var(--line);
        background: linear-gradient(135deg, rgba(53, 92, 125, 0.12), rgba(255,255,255,0.5));
      }
      .texture-frame img {
        width: 100%;
        height: 180px;
        object-fit: contain;
        image-rendering: pixelated;
      }
      .texture-overlay {
        position: absolute;
        left: 12px;
        bottom: 12px;
        padding: 10px 12px;
        border-radius: 14px;
        background: rgba(21, 33, 48, 0.72);
        color: white;
      }
      .texture-overlay span {
        display: block;
        font-size: 11px;
        opacity: 0.75;
        text-transform: uppercase;
      }
      .grid-2 {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      .panel {
        padding: 14px;
        border-radius: 18px;
        background: #faf8f3;
      }
      .panel h3 {
        margin: 0 0 10px;
      }
      .panel ul {
        margin: 0;
        padding-left: 18px;
        color: var(--muted);
      }
      .visual-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 12px;
      }
      .visual-card {
        overflow: hidden;
        border-radius: 18px;
        border: 1px solid #d8e4ee;
        background: white;
      }
      .visual-card img {
        display: block;
        width: 100%;
        height: 220px;
        object-fit: contain;
        background:
          linear-gradient(45deg, #f3f6f9 25%, transparent 25%),
          linear-gradient(-45deg, #f3f6f9 25%, transparent 25%),
          linear-gradient(45deg, transparent 75%, #f3f6f9 75%),
          linear-gradient(-45deg, transparent 75%, #f3f6f9 75%);
        background-size: 20px 20px;
        background-position: 0 0, 0 10px, 10px -10px, -10px 0;
      }
      .visual-meta {
        padding: 10px 12px 12px;
      }
      .visual-meta strong,
      .visual-meta span {
        display: block;
      }
      .visual-meta span {
        margin-top: 4px;
        color: var(--muted);
        font-size: 13px;
      }
      .chip-list {
        list-style: none;
        margin: 0;
        padding: 0;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .chip {
        min-width: 110px;
        padding: 10px 12px;
        border-radius: 16px;
        background: #eef3f7;
        border: 1px solid #d8e4ee;
      }
      .chip strong,
      .chip span {
        display: block;
      }
      .chip span {
        margin-top: 4px;
        color: var(--muted);
        font-size: 13px;
      }
      @media (max-width: 720px) {
        .grid-2 {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <h1>中间态预览</h1>
        <p>当前页面直接展示请求输入沉淀、组件状态、变体定义和 Spine 占位资源，便于在正式导出前检查 package 是否已经齐备。</p>
      </section>
      <section class="grid">
        ${cards.join('\n')}
      </section>
    </main>
  </body>
</html>`;

  const report = {
    generatedAt: new Date().toISOString(),
    packageCount: reportPackages.length,
    packages: reportPackages
  };

  await fs.writeFile(path.join(resolvedOutputRoot, 'index.html'), html, 'utf8');
  await fs.writeFile(
    path.join(resolvedOutputRoot, 'report.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  );

  return {
    html,
    report
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const packagesRoot = process.argv[2] ?? path.resolve(process.cwd(), 'workspace', 'packages');
  const outputRoot = process.argv[3] ?? path.resolve(process.cwd(), 'workspace', 'preview', 'packages');
  const preview = await buildPackagePreview({ packagesRoot, outputRoot });
  console.log(`PREVIEW PACKAGE OK count=${preview.report.packageCount} output=${outputRoot}`);
}
