import fs from 'node:fs/promises';
import path from 'node:path';

import { getOfficialSampleCatalog } from './b1_sample_catalog.mjs';
import { validateSampleBundle } from './validate_sample_bundle.mjs';

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

export async function buildSamplePreview({
  bundleRoot,
  outputRoot,
  sampleCatalog = getOfficialSampleCatalog()
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
  const report = await validateSampleBundle({ bundleRoot: resolvedBundleRoot });
  const bundle = await readJson(path.join(resolvedBundleRoot, 'bundle_manifest.json'));

  await fs.rm(resolvedOutputRoot, { recursive: true, force: true });
  await fs.mkdir(assetsRoot, { recursive: true });

  const characterCards = [];
  const reportCharacters = [];

  for (const item of bundle.characters) {
    const manifestPath = path.join(resolvedBundleRoot, item.characterManifest);
    const manifest = await readJson(manifestPath);
    const sample = sampleCatalog.find(entry => entry.presentationId === manifest.presentationId);
    const primaryTexture = manifest.texturePages[0];
    const sourceTexture = path.join(path.dirname(manifestPath), primaryTexture);
    const targetTexture = path.join(assetsRoot, primaryTexture);
    await fs.copyFile(sourceTexture, targetTexture);

    reportCharacters.push({
      presentationId: manifest.presentationId,
      role: sample?.role || 'unknown',
      manifest
    });

    characterCards.push(`
      <article class="card">
        <header>
          <div>
            <div class="eyebrow">${escapeHtml(sample?.role || 'unknown')}</div>
            <h2>${escapeHtml(manifest.presentationId)}</h2>
          </div>
          <span class="status">validated</span>
        </header>
        <img src="./assets/${escapeHtml(primaryTexture)}" alt="${escapeHtml(manifest.presentationId)} texture preview" />
        <dl>
          <div><dt>Skeleton</dt><dd>${escapeHtml(manifest.skeletonFile)}</dd></div>
          <div><dt>Atlas</dt><dd>${escapeHtml(manifest.atlasFile)}</dd></div>
          <div><dt>Default Skin</dt><dd>${escapeHtml(manifest.defaultSkin ?? 'null')}</dd></div>
          <div><dt>Animations</dt><dd>${escapeHtml(manifest.animations.join(', '))}</dd></div>
          <div><dt>Slots</dt><dd>${escapeHtml(manifest.slots.join(', '))}</dd></div>
        </dl>
        <section class="runtime-placeholder">
          <h3>Runtime Placeholder</h3>
          <p>本区为后续浏览器内 Spine runtime 播放预留，B1 阶段仅验证静态 bundle 证据。</p>
        </section>
      </article>
    `);
  }

  const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>B1 Official Sample Bundle Preview</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #162032;
        --muted: #586271;
        --surface: #f7f5f0;
        --card: #ffffff;
        --line: #d6d0c6;
        --accent: #b5532f;
        --accent-soft: #f7e3d7;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Noto Sans SC", "PingFang SC", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, #fff2d9 0, transparent 30%),
          linear-gradient(180deg, #f4efe7 0%, #f0eee9 100%);
      }
      main {
        max-width: 1120px;
        margin: 0 auto;
        padding: 48px 20px 64px;
      }
      .hero {
        margin-bottom: 28px;
        padding: 28px;
        border: 1px solid var(--line);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.85);
        backdrop-filter: blur(10px);
      }
      .hero h1 {
        margin: 0 0 8px;
        font-size: 36px;
      }
      .hero p {
        margin: 0;
        color: var(--muted);
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 20px;
      }
      .card {
        padding: 20px;
        border: 1px solid var(--line);
        border-radius: 24px;
        background: var(--card);
        box-shadow: 0 18px 40px rgba(22, 32, 50, 0.08);
      }
      .card header {
        display: flex;
        align-items: start;
        justify-content: space-between;
        gap: 16px;
      }
      .eyebrow {
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--accent);
      }
      .status {
        padding: 6px 10px;
        border-radius: 999px;
        background: var(--accent-soft);
        color: var(--accent);
        font-size: 12px;
      }
      img {
        width: 100%;
        margin: 16px 0;
        border: 1px solid var(--line);
        border-radius: 16px;
        background: #faf8f2;
      }
      dl {
        margin: 0;
        display: grid;
        gap: 10px;
      }
      dt {
        font-weight: 700;
      }
      dd {
        margin: 4px 0 0;
        color: var(--muted);
      }
      .runtime-placeholder {
        margin-top: 16px;
        padding: 16px;
        border-radius: 16px;
        background: #faf3ee;
      }
      code {
        font-family: "JetBrains Mono", "Fira Code", monospace;
        font-size: 0.95em;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <h1>${escapeHtml(bundle.bundleId)}</h1>
        <p>characters=${bundle.characters.length} validated=${report.ok ? 'true' : 'false'} bundleVersion=${escapeHtml(bundle.bundleVersion)}</p>
      </section>
      <section class="grid">
        ${characterCards.join('\n')}
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
  const bundleRoot = path.resolve(process.cwd(), 'workspace', 'exports', 'b1_official_samples');
  const outputRoot = path.resolve(process.cwd(), 'workspace', 'preview', 'b1_official_samples');
  const preview = await buildSamplePreview({ bundleRoot, outputRoot });
  console.log(`PREVIEW OK chars=${preview.report.characters.length} output=${outputRoot}`);
}
