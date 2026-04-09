import fs from 'node:fs/promises';
import path from 'node:path';

import {
  validateCharacterRequest,
  validateCharacterRequestCollection
} from './validate_character_request.mjs';

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

async function writeJson(filePath, value) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), 'utf8');
}

async function copyFileEnsured(sourcePath, targetPath) {
  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.copyFile(sourcePath, targetPath);
}

async function listFilesRecursive(rootDir, relativePrefix = '') {
  const resolvedRoot = path.resolve(rootDir);
  const entries = await fs.readdir(resolvedRoot, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const absolutePath = path.join(resolvedRoot, entry.name);
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
  const requestJsonPath = path.join(resolvedRoot, 'request.json');

  try {
    await fs.access(requestJsonPath);
    return [await validateCharacterRequest({ requestRoot: resolvedRoot })];
  } catch {
    return validateCharacterRequestCollection({ requestsRoot: resolvedRoot });
  }
}

async function pruneObsoleteJobDirs(outputRoot, keepJobIds) {
  await fs.mkdir(outputRoot, { recursive: true });
  const entries = await fs.readdir(outputRoot, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    if (keepJobIds.has(entry.name)) {
      continue;
    }
    await fs.rm(path.join(outputRoot, entry.name), { recursive: true, force: true });
  }
}

function buildJobId(request) {
  return `${request.presentationId}__${request.characterRequestId}`;
}

export async function buildBlackboxJobs({
  requestsRoot,
  outputRoot,
  providerType = 'manual',
  providerName = 'manual'
}) {
  if (!requestsRoot) {
    throw new Error('缺少 requestsRoot');
  }
  if (!outputRoot) {
    throw new Error('缺少 outputRoot');
  }

  const reports = await resolveRequestReports(requestsRoot);
  const resolvedOutputRoot = path.resolve(outputRoot);
  const keepJobIds = new Set();
  const jobs = [];

  for (const report of reports) {
    const request = await readJson(path.join(report.requestRoot, 'request.json'));
    keepJobIds.add(buildJobId(request));
  }

  await pruneObsoleteJobDirs(resolvedOutputRoot, keepJobIds);

  for (const report of reports) {
    const request = await readJson(path.join(report.requestRoot, 'request.json'));
    const jobId = buildJobId(request);
    const jobRoot = path.join(resolvedOutputRoot, jobId);
    const inputRoot = path.join(jobRoot, 'input');
    const createdAt = new Date().toISOString();

    await fs.rm(jobRoot, { recursive: true, force: true });
    await fs.mkdir(path.join(jobRoot, 'artifacts'), { recursive: true });
    await fs.mkdir(path.join(jobRoot, 'evidence'), { recursive: true });
    await fs.mkdir(path.join(jobRoot, 'logs'), { recursive: true });

    await copyFileEnsured(
      path.join(report.requestRoot, 'request.json'),
      path.join(inputRoot, 'request.json')
    );
    await fs.cp(path.join(report.requestRoot, 'art'), path.join(inputRoot, 'art'), { recursive: true });
    await fs.cp(path.join(report.requestRoot, 'notes'), path.join(inputRoot, 'notes'), { recursive: true });
    await fs.cp(path.join(report.requestRoot, 'refs'), path.join(inputRoot, 'refs'), { recursive: true });

    const inputSnapshot = {
      requestJson: 'input/request.json',
      artFiles: await listFilesRecursive(path.join(inputRoot, 'art'), 'input/art'),
      noteFiles: await listFilesRecursive(path.join(inputRoot, 'notes'), 'input/notes'),
      refFiles: await listFilesRecursive(path.join(inputRoot, 'refs'), 'input/refs')
    };

    const job = {
      schemaVersion: 'blackbox_job_v1',
      jobId,
      characterRequestId: request.characterRequestId,
      presentationId: request.presentationId,
      providerType,
      providerName,
      status: 'prepared',
      requestedSlots: [...request.requiredSlots],
      requestedVariants: request.variants.map(variant => variant.variantId),
      createdAt,
      updatedAt: createdAt,
      inputSnapshot,
      outputs: {
        layerPlanFile: null,
        slotMapFile: null,
        variantPlanFile: null,
        componentArtifacts: {}
      },
      errors: []
    };

    await writeJson(path.join(jobRoot, 'job.json'), job);

    jobs.push({
      jobId,
      jobRoot,
      presentationId: request.presentationId,
      characterRequestId: request.characterRequestId,
      status: job.status
    });
  }

  jobs.sort((left, right) => left.jobId.localeCompare(right.jobId));

  return {
    outputRoot: resolvedOutputRoot,
    jobs
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const requestsRoot = process.argv[2] ?? path.resolve(process.cwd(), 'workspace', 'requests');
  const outputRoot = process.argv[3] ?? path.resolve(process.cwd(), 'workspace', 'blackbox_jobs');
  const providerType = process.argv[4] ?? 'manual';
  const providerName = process.argv[5] ?? providerType;
  const result = await buildBlackboxJobs({ requestsRoot, outputRoot, providerType, providerName });
  console.log(`BUILD BLACKBOX JOBS OK count=${result.jobs.length} output=${result.outputRoot}`);
}
