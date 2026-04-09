import fs from 'node:fs/promises';
import path from 'node:path';

export const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aK1sAAAAASUVORK5CYII=';

export const BLACKBOX_LAYER_PLAN_FILE = 'artifacts/layer_plan.json';
export const BLACKBOX_SLOT_MAP_FILE = 'artifacts/slot_map.json';
export const BLACKBOX_VARIANT_PLAN_FILE = 'artifacts/variant_plan.json';
export const BLACKBOX_PROVIDER_REPORT_FILE = 'evidence/provider_report.json';

export async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

export async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

export async function writeText(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf8');
}

export async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function copyFileEnsured(sourcePath, targetPath) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
}

export async function writeTinyPng(filePath) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, Buffer.from(TINY_PNG_BASE64, 'base64'));
}

export function isImageFile(filePath) {
  return ['.png', '.jpg', '.jpeg', '.webp'].includes(path.extname(filePath).toLowerCase());
}

export function findPrimaryImage(filePaths) {
  return filePaths.find(isImageFile) ?? null;
}

export async function resolveJobRoots(targetRoot) {
  if (!targetRoot) {
    throw new Error('缺少 jobsRoot');
  }

  const resolvedRoot = path.resolve(targetRoot);
  const jobJsonPath = path.join(resolvedRoot, 'job.json');
  if (await pathExists(jobJsonPath)) {
    return [resolvedRoot];
  }

  const entries = await fs.readdir(resolvedRoot, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(resolvedRoot, entry.name))
    .sort((left, right) => left.localeCompare(right));
}

export function buildComponentArtifactFile(slotName) {
  return path.posix.join('artifacts', 'components', slotName, 'render.png');
}

export function buildComponentArtifactMap(requestedSlots) {
  return Object.fromEntries(
    [...requestedSlots]
      .sort((left, right) => left.localeCompare(right))
      .map(slotName => [
        slotName,
        {
          artifactFile: buildComponentArtifactFile(slotName)
        }
      ])
  );
}

export function resolveArtifactFile(componentArtifactEntry) {
  if (!componentArtifactEntry) {
    return null;
  }
  if (typeof componentArtifactEntry === 'string') {
    return componentArtifactEntry;
  }
  if (Array.isArray(componentArtifactEntry)) {
    return componentArtifactEntry.find(item => typeof item === 'string') ?? null;
  }
  if (typeof componentArtifactEntry === 'object') {
    if (typeof componentArtifactEntry.artifactFile === 'string') {
      return componentArtifactEntry.artifactFile;
    }
    if (Array.isArray(componentArtifactEntry.artifactFiles)) {
      return componentArtifactEntry.artifactFiles.find(item => typeof item === 'string') ?? null;
    }
  }
  return null;
}

export function buildJobOutputSnapshot(job) {
  return {
    layerPlanFile: job.outputs?.layerPlanFile ?? null,
    slotMapFile: job.outputs?.slotMapFile ?? null,
    variantPlanFile: job.outputs?.variantPlanFile ?? null,
    componentArtifacts: job.outputs?.componentArtifacts ?? {}
  };
}

export function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function translateJobStatus(status) {
  switch (status) {
    case 'prepared':
      return '已准备';
    case 'submitted':
      return '已提交';
    case 'running':
      return '处理中';
    case 'succeeded':
      return '已成功';
    case 'failed':
      return '已失败';
    case 'cancelled':
      return '已取消';
    case 'manual_pending':
      return '待人工补件';
    case 'manual_completed':
      return '人工完成';
    default:
      return status;
  }
}

export function buildPreviewAssetName(prefix, relativePath) {
  return `${prefix}--${relativePath.replaceAll('/', '--')}`;
}

export async function copyPreviewAsset({
  sourceRoot,
  relativePath,
  assetsRoot,
  prefix
}) {
  const assetName = buildPreviewAssetName(prefix, relativePath);
  await copyFileEnsured(
    path.join(sourceRoot, relativePath),
    path.join(assetsRoot, assetName)
  );
  return assetName;
}
