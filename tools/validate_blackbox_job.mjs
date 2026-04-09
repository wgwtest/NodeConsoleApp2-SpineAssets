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

function validateBlackboxJobShape(job) {
  assertObject(job, 'blackbox_job');

  if (job.schemaVersion !== 'blackbox_job_v1') {
    throw new Error(`blackbox_job.schemaVersion 不支持: ${job.schemaVersion}`);
  }

  for (const key of [
    'jobId',
    'characterRequestId',
    'presentationId',
    'providerType',
    'providerName',
    'status',
    'createdAt',
    'updatedAt'
  ]) {
    assertRequiredString(job[key], `blackbox_job.${key}`);
  }

  if (!['manual', 'cloud_stub'].includes(job.providerType)) {
    throw new Error(`blackbox_job.providerType 不支持: ${job.providerType}`);
  }

  if (![
    'created',
    'prepared',
    'submitted',
    'running',
    'succeeded',
    'failed',
    'cancelled',
    'manual_pending',
    'manual_completed'
  ].includes(job.status)) {
    throw new Error(`blackbox_job.status 不支持: ${job.status}`);
  }

  assertRequiredArray(job.requestedSlots, 'blackbox_job.requestedSlots');
  assertRequiredArray(job.requestedVariants, 'blackbox_job.requestedVariants');
  assertRequiredArray(job.errors, 'blackbox_job.errors');

  assertObject(job.inputSnapshot, 'blackbox_job.inputSnapshot');
  assertRequiredString(job.inputSnapshot.requestJson, 'blackbox_job.inputSnapshot.requestJson');
  assertRequiredArray(job.inputSnapshot.artFiles, 'blackbox_job.inputSnapshot.artFiles');
  assertRequiredArray(job.inputSnapshot.noteFiles, 'blackbox_job.inputSnapshot.noteFiles');
  assertRequiredArray(job.inputSnapshot.refFiles, 'blackbox_job.inputSnapshot.refFiles');

  assertObject(job.outputs, 'blackbox_job.outputs');
  assertObject(job.outputs.componentArtifacts, 'blackbox_job.outputs.componentArtifacts');
}

export async function validateBlackboxJob({ jobRoot }) {
  if (!jobRoot) {
    throw new Error('缺少 jobRoot');
  }

  const resolvedRoot = path.resolve(jobRoot);
  const jobPath = path.join(resolvedRoot, 'job.json');
  await assertPathExists(jobPath, 'job.json');
  await assertDirectoryHasEntries(path.join(resolvedRoot, 'input'), 'input');

  const job = await readJson(jobPath);
  validateBlackboxJobShape(job);

  await assertPathExists(
    path.join(resolvedRoot, job.inputSnapshot.requestJson),
    'blackbox input request'
  );

  for (const relativePath of job.inputSnapshot.artFiles) {
    assertRequiredString(relativePath, 'blackbox_job.inputSnapshot.artFiles[]');
    await assertPathExists(path.join(resolvedRoot, relativePath), `blackbox input art ${relativePath}`);
  }

  for (const relativePath of job.inputSnapshot.noteFiles) {
    assertRequiredString(relativePath, 'blackbox_job.inputSnapshot.noteFiles[]');
    await assertPathExists(path.join(resolvedRoot, relativePath), `blackbox input note ${relativePath}`);
  }

  for (const relativePath of job.inputSnapshot.refFiles) {
    assertRequiredString(relativePath, 'blackbox_job.inputSnapshot.refFiles[]');
    await assertPathExists(path.join(resolvedRoot, relativePath), `blackbox input ref ${relativePath}`);
  }

  return {
    ok: true,
    jobRoot: resolvedRoot,
    jobId: job.jobId,
    characterRequestId: job.characterRequestId,
    presentationId: job.presentationId,
    providerType: job.providerType,
    providerName: job.providerName,
    status: job.status,
    requestedSlotCount: job.requestedSlots.length,
    requestedVariantCount: job.requestedVariants.length
  };
}

export async function validateBlackboxJobCollection({ jobsRoot }) {
  if (!jobsRoot) {
    throw new Error('缺少 jobsRoot');
  }

  const resolvedRoot = path.resolve(jobsRoot);
  await assertPathExists(resolvedRoot, 'jobsRoot');
  const entries = await fs.readdir(resolvedRoot, { withFileTypes: true });
  const jobDirs = entries
    .filter(entry => entry.isDirectory())
    .map(entry => path.join(resolvedRoot, entry.name));

  const reports = [];
  for (const dir of jobDirs) {
    reports.push(await validateBlackboxJob({ jobRoot: dir }));
  }

  return reports;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const targetRoot = process.argv[2] ?? path.resolve(process.cwd(), 'workspace', 'blackbox_jobs');
  const jobJsonPath = path.join(targetRoot, 'job.json');

  try {
    await fs.access(jobJsonPath);
    const report = await validateBlackboxJob({ jobRoot: targetRoot });
    console.log(`VALIDATE BLACKBOX JOB OK jobId=${report.jobId} status=${report.status}`);
  } catch {
    const reports = await validateBlackboxJobCollection({ jobsRoot: targetRoot });
    console.log(`VALIDATE BLACKBOX JOB ROOT OK count=${reports.length}`);
  }
}
