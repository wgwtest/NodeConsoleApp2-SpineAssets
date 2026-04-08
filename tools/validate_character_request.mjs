import fs from 'node:fs/promises';
import path from 'node:path';

function assertObject(value, label) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} 必须是 object`);
  }
}

function assertRequiredString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error(`${label} 必须是非空字符串`);
  }
}

function assertRequiredArray(value, label) {
  if (!Array.isArray(value)) {
    throw new Error(`${label} 必须是 array`);
  }
}

async function assertPathExists(filePath, label) {
  try {
    await fs.access(filePath);
  } catch {
    throw new Error(`${label} 缺失: ${filePath}`);
  }
}

async function assertDirectoryHasEntries(dirPath, label) {
  await assertPathExists(dirPath, label);
  const entries = await fs.readdir(dirPath);
  if (entries.length === 0) {
    throw new Error(`${label} 不能为空: ${dirPath}`);
  }
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function validateRequestShape(request) {
  assertObject(request, 'request');

  if (request.schemaVersion !== 'character_request_v1') {
    throw new Error(`request.schemaVersion 不支持: ${request.schemaVersion}`);
  }

  for (const key of [
    'characterRequestId',
    'presentationId',
    'title',
    'description',
    'bundleTarget'
  ]) {
    assertRequiredString(request[key], `request.${key}`);
  }

  assertRequiredArray(request.variants, 'request.variants');
  if (request.variants.length === 0) {
    throw new Error('request.variants 不能为空');
  }

  for (const [index, variant] of request.variants.entries()) {
    assertObject(variant, `request.variants[${index}]`);
    for (const key of ['variantId', 'label', 'skin']) {
      assertRequiredString(variant[key], `request.variants[${index}].${key}`);
    }
  }

  assertRequiredArray(request.requiredActions, 'request.requiredActions');
  assertRequiredArray(request.requiredSlots, 'request.requiredSlots');
}

export async function validateCharacterRequest({ requestRoot }) {
  if (!requestRoot) {
    throw new Error('缺少 requestRoot');
  }

  const resolvedRoot = path.resolve(requestRoot);
  const requestPath = path.join(resolvedRoot, 'request.json');
  await assertPathExists(requestPath, 'request.json');
  const request = await readJson(requestPath);
  validateRequestShape(request);

  await assertDirectoryHasEntries(path.join(resolvedRoot, 'art'), 'art');
  await assertDirectoryHasEntries(path.join(resolvedRoot, 'notes'), 'notes');
  await assertPathExists(path.join(resolvedRoot, 'refs'), 'refs');

  return {
    ok: true,
    requestRoot: resolvedRoot,
    characterRequestId: request.characterRequestId,
    presentationId: request.presentationId,
    bundleTarget: request.bundleTarget,
    variantCount: request.variants.length,
    requiredActionCount: request.requiredActions.length,
    requiredSlotCount: request.requiredSlots.length
  };
}

export async function validateCharacterRequestCollection({ requestsRoot }) {
  if (!requestsRoot) {
    throw new Error('缺少 requestsRoot');
  }

  const resolvedRoot = path.resolve(requestsRoot);
  await assertPathExists(resolvedRoot, 'requestsRoot');
  const entries = await fs.readdir(resolvedRoot, { withFileTypes: true });
  const requestDirs = entries
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(resolvedRoot, entry.name));

  const reports = [];
  for (const dir of requestDirs) {
    reports.push(await validateCharacterRequest({ requestRoot: dir }));
  }

  return reports;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const targetRoot = process.argv[2] ?? path.resolve(process.cwd(), 'workspace', 'requests');
  const requestJsonPath = path.join(targetRoot, 'request.json');

  try {
    await fs.access(requestJsonPath);
    const report = await validateCharacterRequest({ requestRoot: targetRoot });
    console.log(
      `VALIDATE REQUEST OK presentationId=${report.presentationId} variants=${report.variantCount}`
    );
  } catch {
    const reports = await validateCharacterRequestCollection({ requestsRoot: targetRoot });
    console.log(`VALIDATE REQUEST ROOT OK count=${reports.length}`);
  }
}
