import fs from 'node:fs/promises';
import path from 'node:path';

import { validateRequestBundle } from './validate_request_bundle.mjs';

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

function renderValidationText(ok) {
  return ok ? '校验通过' : '校验失败';
}

function renderVariantPills(manifest) {
  return manifest.variants
    .map(variant => {
      const tone = variant.variantId === manifest.defaultVariantId ? 'pill pill-default' : 'pill';
      const pillLabel = variant.variantId === manifest.defaultVariantId
        ? `${variant.label} · ${variant.skin} · 默认`
        : `${variant.label} · ${variant.skin}`;
      const requiredComponents = Array.isArray(variant.requiredComponents) &&
        variant.requiredComponents.length > 0
        ? variant.requiredComponents.join(', ')
        : '未声明';
      const notes = typeof variant.notes === 'string' && variant.notes.length > 0
        ? `<p>${escapeHtml(variant.notes)}</p>`
        : '';
      return `<li class="${tone}">
        <strong>${escapeHtml(variant.variantId)}</strong>
        <span>${escapeHtml(pillLabel)}</span>
        <em>组件: ${escapeHtml(requiredComponents)}</em>
        ${notes}
      </li>`;
    })
    .join('\n');
}

export async function buildRequestPreview({
  bundleRoot,
  outputRoot
}) {
  if (!bundleRoot) {
    throw new Error('缺少 bundleRoot');
  }
  if (!outputRoot) {
    throw new Error('缺少 outputRoot');
  }

  const resolvedBundleRoot = path.resolve(bundleRoot);
  const resolvedOutputRoot = path.resolve(outputRoot);
  const assetsRoot = path.join(resolvedOutputRoot, 'assets');
  const report = await validateRequestBundle({ bundleRoot: resolvedBundleRoot });
  const bundle = await readJson(path.join(resolvedBundleRoot, 'bundle_manifest.json'));

  await fs.rm(resolvedOutputRoot, { recursive: true, force: true });
  await fs.mkdir(assetsRoot, { recursive: true });

  const cards = [];
  const reportCharacters = [];
  let totalVariants = 0;

  for (const item of bundle.characters) {
    const manifestPath = path.join(resolvedBundleRoot, item.characterManifest);
    const manifest = await readJson(manifestPath);
    const characterDir = path.dirname(manifestPath);
    const primaryTexture = manifest.texturePages[0];
    const copiedTexture = path.join(assetsRoot, primaryTexture);
    await fs.copyFile(path.join(characterDir, primaryTexture), copiedTexture);

    totalVariants += manifest.variants.length;
    reportCharacters.push({
      presentationId: manifest.presentationId,
      variantCount: manifest.variants.length,
      manifest
    });

    cards.push(`
      <article class="card">
        <header class="card-header">
          <div>
            <div class="eyebrow">正式交付包</div>
            <h2>${escapeHtml(manifest.presentationId)}</h2>
          </div>
          <span class="status">${renderValidationText(report.ok)}</span>
        </header>
        <div class="texture-frame">
          <img src="./assets/${escapeHtml(primaryTexture)}" alt="${escapeHtml(manifest.presentationId)} 纹理预览" />
          <div class="texture-overlay">
            <span>纹理</span>
            <strong>${escapeHtml(primaryTexture)}</strong>
          </div>
        </div>
        <dl class="facts">
          <div><dt>骨骼文件</dt><dd>${escapeHtml(manifest.skeletonFile)}</dd></div>
          <div><dt>图集文件</dt><dd>${escapeHtml(manifest.atlasFile)}</dd></div>
          <div><dt>默认变体</dt><dd>${escapeHtml(manifest.defaultVariantId)}</dd></div>
          <div><dt>动画列表</dt><dd>${escapeHtml(manifest.animations.join(', '))}</dd></div>
          <div><dt>槽位列表</dt><dd>${escapeHtml(manifest.slots.join(', '))}</dd></div>
        </dl>
        <section class="variants">
          <h3>变体</h3>
          <ul>
            ${renderVariantPills(manifest)}
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
    <title>正式交付预览</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #112235;
        --muted: #5b6774;
        --surface: #f2efe8;
        --card: rgba(255, 255, 255, 0.92);
        --line: #d5d0c8;
        --accent: #145b73;
        --accent-soft: #dff1f7;
        --accent-strong: #cf5c36;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Noto Sans SC", "PingFang SC", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(20, 91, 115, 0.14) 0, transparent 32%),
          radial-gradient(circle at bottom right, rgba(207, 92, 54, 0.12) 0, transparent 28%),
          linear-gradient(180deg, #f8f5ef 0%, #ece8df 100%);
      }
      main {
        max-width: 1180px;
        margin: 0 auto;
        padding: 48px 20px 72px;
      }
      .hero {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 18px;
        margin-bottom: 28px;
      }
      .hero-panel,
      .hero-stats,
      .card {
        border: 1px solid var(--line);
        border-radius: 24px;
        background: var(--card);
        box-shadow: 0 16px 36px rgba(17, 34, 53, 0.08);
      }
      .hero-panel {
        padding: 28px;
      }
      .hero-panel h1 {
        margin: 0 0 10px;
        font-size: 38px;
        letter-spacing: -0.03em;
      }
      .hero-panel p {
        margin: 0;
        color: var(--muted);
        line-height: 1.6;
      }
      .hero-stats {
        padding: 22px;
        display: grid;
        gap: 12px;
      }
      .stat {
        padding: 12px 14px;
        border-radius: 16px;
        background: #faf8f3;
      }
      .stat strong {
        display: block;
        font-size: 20px;
      }
      .stat span {
        color: var(--muted);
        font-size: 13px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
        gap: 20px;
      }
      .card {
        padding: 20px;
      }
      .card-header {
        display: flex;
        align-items: start;
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
        min-height: 210px;
        margin: 16px 0;
        border-radius: 20px;
        border: 1px solid var(--line);
        overflow: hidden;
        background:
          linear-gradient(135deg, rgba(20, 91, 115, 0.12), rgba(207, 92, 54, 0.08)),
          repeating-linear-gradient(
            45deg,
            rgba(255, 255, 255, 0.35) 0,
            rgba(255, 255, 255, 0.35) 10px,
            rgba(17, 34, 53, 0.02) 10px,
            rgba(17, 34, 53, 0.02) 20px
          );
      }
      .texture-frame img {
        width: 100%;
        height: 210px;
        object-fit: contain;
        image-rendering: pixelated;
      }
      .texture-overlay {
        position: absolute;
        left: 14px;
        bottom: 14px;
        padding: 10px 12px;
        border-radius: 14px;
        background: rgba(17, 34, 53, 0.72);
        color: #fff;
        backdrop-filter: blur(8px);
      }
      .texture-overlay span {
        display: block;
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        opacity: 0.75;
      }
      .facts {
        margin: 0;
        display: grid;
        gap: 10px;
      }
      .facts dt {
        font-weight: 700;
      }
      .facts dd {
        margin: 4px 0 0;
        color: var(--muted);
      }
      .variants {
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid var(--line);
      }
      .variants h3 {
        margin: 0 0 12px;
      }
      .variants ul {
        list-style: none;
        padding: 0;
        margin: 0;
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
      }
      .pill {
        padding: 10px 12px;
        border-radius: 16px;
        background: #f3f7f8;
        border: 1px solid #d4e4ea;
        min-width: 110px;
      }
      .pill-default {
        background: #fff0ea;
        border-color: #f2c7b7;
      }
      .pill strong,
      .pill span {
        display: block;
      }
      .pill span {
        margin-top: 4px;
        color: var(--muted);
        font-size: 13px;
      }
      .pill em {
        display: block;
        margin-top: 8px;
        color: var(--accent);
        font-style: normal;
        font-size: 12px;
        line-height: 1.5;
      }
      .pill p {
        margin: 8px 0 0;
        color: var(--muted);
        font-size: 12px;
        line-height: 1.5;
      }
      @media (max-width: 820px) {
        .hero {
          grid-template-columns: 1fr;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <div class="hero-panel">
          <h1>${escapeHtml(bundle.bundleId)}</h1>
          <p>正式交付预览页。当前页面会检查导出的 bundle、character manifest 与 texture/atlas/skeleton 资源是否齐备，并把同一角色下的多个变体直接展示出来。</p>
        </div>
        <aside class="hero-stats">
          <div class="stat"><strong>${bundle.characters.length}</strong><span>角色数</span></div>
          <div class="stat"><strong>${totalVariants}</strong><span>变体数</span></div>
          <div class="stat"><strong>${renderValidationText(report.ok)}</strong><span>校验状态</span></div>
        </aside>
      </section>
      <section class="grid">
        ${cards.join('\n')}
      </section>
    </main>
  </body>
</html>`;

  const reportFile = {
    generatedAt: new Date().toISOString(),
    bundleId: bundle.bundleId,
    validation: report,
    characters: reportCharacters
  };

  await fs.writeFile(path.join(resolvedOutputRoot, 'index.html'), html, 'utf8');
  await fs.writeFile(
    path.join(resolvedOutputRoot, 'report.json'),
    JSON.stringify(reportFile, null, 2),
    'utf8'
  );

  return {
    html,
    report: reportFile
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const bundleRoot =
    process.argv[2] ?? path.resolve(process.cwd(), 'workspace', 'exports', 'request_driven_bundle');
  const outputRoot =
    process.argv[3] ?? path.resolve(process.cwd(), 'workspace', 'preview', 'request_driven_bundle');
  const preview = await buildRequestPreview({ bundleRoot, outputRoot });
  console.log(`PREVIEW REQUEST BUNDLE OK chars=${preview.report.characters.length} output=${outputRoot}`);
}
