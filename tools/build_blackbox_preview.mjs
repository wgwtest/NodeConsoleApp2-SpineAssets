import fs from 'node:fs/promises';
import path from 'node:path';

import { validateBlackboxJob, validateBlackboxJobCollection } from './validate_blackbox_job.mjs';
import {
  BLACKBOX_PROVIDER_REPORT_FILE,
  copyPreviewAsset,
  escapeHtml,
  isImageFile,
  readJson,
  resolveArtifactFile,
  translateJobStatus
} from './lib/blackbox_shared.mjs';

async function resolveJobReports(jobsRoot) {
  const resolvedRoot = path.resolve(jobsRoot);
  const jobJsonPath = path.join(resolvedRoot, 'job.json');

  try {
    await fs.access(jobJsonPath);
    return [await validateBlackboxJob({ jobRoot: resolvedRoot })];
  } catch {
    return validateBlackboxJobCollection({ jobsRoot: resolvedRoot });
  }
}

function renderChipList(items) {
  return items.map(item => `<li class="chip">${escapeHtml(item)}</li>`).join('\n');
}

function renderImageCards(items) {
  if (items.length === 0) {
    return '<p class="muted">暂无可预览图片。</p>';
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

export async function buildBlackboxPreview({
  jobsRoot,
  outputRoot
}) {
  if (!jobsRoot) {
    throw new Error('缺少 jobsRoot');
  }
  if (!outputRoot) {
    throw new Error('缺少 outputRoot');
  }

  const reports = await resolveJobReports(jobsRoot);
  const resolvedOutputRoot = path.resolve(outputRoot);
  const assetsRoot = path.join(resolvedOutputRoot, 'assets');

  await fs.rm(resolvedOutputRoot, { recursive: true, force: true });
  await fs.mkdir(assetsRoot, { recursive: true });

  const jobCards = [];
  const previewJobs = [];

  for (const report of reports) {
    const job = await readJson(path.join(report.jobRoot, 'job.json'));
    const providerReportPath = path.join(report.jobRoot, BLACKBOX_PROVIDER_REPORT_FILE);
    const providerReport = await fs
      .readFile(providerReportPath, 'utf8')
      .then(content => JSON.parse(content))
      .catch(() => null);

    const inputArtImages = [];
    for (const relativePath of job.inputSnapshot.artFiles.filter(isImageFile)) {
      inputArtImages.push({
        label: path.basename(relativePath),
        caption: '输入原画',
        assetName: await copyPreviewAsset({
          sourceRoot: report.jobRoot,
          relativePath,
          assetsRoot,
          prefix: job.jobId
        })
      });
    }

    const componentImages = [];
    for (const [slotName, artifactEntry] of Object.entries(job.outputs.componentArtifacts ?? {})) {
      const artifactFile = resolveArtifactFile(artifactEntry);
      if (!artifactFile || !isImageFile(artifactFile)) {
        continue;
      }
      componentImages.push({
        label: `slot_${slotName}`,
        caption: '组件产物',
        assetName: await copyPreviewAsset({
          sourceRoot: report.jobRoot,
          relativePath: artifactFile,
          assetsRoot,
          prefix: job.jobId
        })
      });
    }

    previewJobs.push({
      jobId: job.jobId,
      presentationId: job.presentationId,
      providerType: job.providerType,
      providerName: job.providerName,
      status: job.status,
      requestedSlots: [...job.requestedSlots],
      requestedVariants: [...job.requestedVariants],
      errorCount: job.errors.length
    });

    jobCards.push(`
      <article class="card">
        <header class="card-header">
          <div>
            <div class="eyebrow">黑盒任务</div>
            <h2>${escapeHtml(job.presentationId)}</h2>
            <p class="job-id">${escapeHtml(job.jobId)}</p>
          </div>
          <span class="status status-${escapeHtml(job.status)}">${escapeHtml(translateJobStatus(job.status))}</span>
        </header>
        <section class="meta-grid">
          <div class="panel">
            <h3>Provider</h3>
            <ul>
              <li><strong>类型：</strong>${escapeHtml(job.providerType)}</li>
              <li><strong>名称：</strong>${escapeHtml(job.providerName)}</li>
              <li><strong>模式：</strong>${escapeHtml(providerReport?.mode ?? 'manual')}</li>
            </ul>
          </div>
          <div class="panel">
            <h3>请求范围</h3>
            <p><strong>Slots</strong></p>
            <ul class="chip-list">${renderChipList(job.requestedSlots)}</ul>
            <p><strong>Variants</strong></p>
            <ul class="chip-list">${renderChipList(job.requestedVariants)}</ul>
          </div>
        </section>
        <section class="panel">
          <h3>输入原画</h3>
          ${renderImageCards(inputArtImages)}
        </section>
        <section class="panel">
          <h3>组件产物</h3>
          ${renderImageCards(componentImages)}
        </section>
        <section class="panel">
          <h3>错误摘要</h3>
          ${job.errors.length === 0
            ? '<p class="muted">当前无错误。</p>'
            : `<ul>${job.errors.map(error => `<li>${escapeHtml(error.code)}: ${escapeHtml(error.message)}</li>`).join('\n')}</ul>`}
        </section>
      </article>
    `);
  }

  const html = `<!doctype html>
<html lang="zh-CN">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>黑盒任务预览</title>
    <style>
      :root {
        color-scheme: light;
        --ink: #1b2330;
        --muted: #5e6774;
        --line: rgba(27, 35, 48, 0.14);
        --card: rgba(255, 255, 255, 0.94);
        --accent: #176087;
        --success: #2b7a3d;
        --warning: #b56d16;
        --danger: #a93a3a;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "Noto Sans SC", "PingFang SC", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top right, rgba(23, 96, 135, 0.14) 0, transparent 28%),
          linear-gradient(180deg, #f8f3ea 0%, #ebe5db 100%);
      }
      main {
        max-width: 1180px;
        margin: 0 auto;
        padding: 48px 20px 72px;
      }
      .hero {
        margin-bottom: 24px;
        padding: 28px;
        border-radius: 28px;
        border: 1px solid var(--line);
        background: var(--card);
        box-shadow: 0 20px 40px rgba(27, 35, 48, 0.08);
      }
      .hero h1 {
        margin: 0 0 8px;
        font-size: clamp(30px, 4vw, 46px);
      }
      .hero p {
        margin: 0;
        color: var(--muted);
      }
      .stack {
        display: grid;
        gap: 20px;
      }
      .card {
        border: 1px solid var(--line);
        border-radius: 24px;
        background: var(--card);
        padding: 24px;
        box-shadow: 0 16px 32px rgba(27, 35, 48, 0.08);
      }
      .card-header {
        display: flex;
        justify-content: space-between;
        gap: 16px;
        align-items: flex-start;
        margin-bottom: 16px;
      }
      .eyebrow {
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      .card h2 {
        margin: 6px 0 4px;
        font-size: 28px;
      }
      .job-id {
        margin: 0;
        color: var(--muted);
        word-break: break-all;
      }
      .status {
        border-radius: 999px;
        padding: 8px 14px;
        background: rgba(23, 96, 135, 0.12);
        color: var(--accent);
        font-weight: 700;
      }
      .status-succeeded,
      .status-manual_completed {
        background: rgba(43, 122, 61, 0.12);
        color: var(--success);
      }
      .status-manual_pending {
        background: rgba(181, 109, 22, 0.12);
        color: var(--warning);
      }
      .status-failed {
        background: rgba(169, 58, 58, 0.12);
        color: var(--danger);
      }
      .meta-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
        gap: 16px;
      }
      .panel {
        margin-top: 16px;
        padding: 18px;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: rgba(255, 255, 255, 0.72);
      }
      .panel h3 {
        margin: 0 0 12px;
      }
      .panel ul {
        margin: 0;
        padding-left: 18px;
      }
      .chip-list {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        padding: 0;
        margin: 8px 0 0;
        list-style: none;
      }
      .chip {
        padding: 8px 12px;
        border-radius: 999px;
        background: rgba(23, 96, 135, 0.08);
      }
      .visual-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
        gap: 14px;
      }
      .visual-card {
        overflow: hidden;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: #fff;
      }
      .visual-card img {
        display: block;
        width: 100%;
        aspect-ratio: 1 / 1;
        object-fit: contain;
        background:
          linear-gradient(135deg, rgba(23, 96, 135, 0.08), rgba(255, 255, 255, 0.9));
      }
      .visual-meta {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 12px;
      }
      .visual-meta span,
      .muted {
        color: var(--muted);
      }
      @media (max-width: 720px) {
        main {
          padding: 28px 14px 44px;
        }
        .card-header {
          flex-direction: column;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <h1>黑盒任务预览</h1>
        <p>用于人工验收 blackbox job 的状态、provider、输入原画和组件产物。</p>
      </section>
      <section class="stack">
        ${jobCards.join('\n')}
      </section>
    </main>
  </body>
</html>`;

  const report = {
    generatedAt: new Date().toISOString(),
    jobs: previewJobs
  };

  await fs.writeFile(path.join(resolvedOutputRoot, 'index.html'), html, 'utf8');
  await fs.writeFile(
    path.join(resolvedOutputRoot, 'report.json'),
    JSON.stringify(report, null, 2),
    'utf8'
  );

  return {
    outputRoot: resolvedOutputRoot,
    html,
    report
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const jobsRoot = process.argv[2] ?? path.resolve(process.cwd(), 'workspace', 'blackbox_jobs');
  const outputRoot = process.argv[3] ?? path.resolve(process.cwd(), 'workspace', 'preview', 'blackbox');
  const result = await buildBlackboxPreview({ jobsRoot, outputRoot });
  console.log(`BUILD BLACKBOX PREVIEW OK jobs=${result.report.jobs.length} output=${result.outputRoot}`);
}
