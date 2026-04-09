import fs from 'node:fs/promises';
import path from 'node:path';

import { buildRequestPackage } from './build_request_package.mjs';
import {
  BLACKBOX_LAYER_PLAN_FILE,
  BLACKBOX_PROVIDER_REPORT_FILE,
  BLACKBOX_SLOT_MAP_FILE,
  BLACKBOX_VARIANT_PLAN_FILE,
  copyFileEnsured,
  pathExists,
  readJson,
  resolveArtifactFile,
  resolveJobRoots,
  writeJson
} from './lib/blackbox_shared.mjs';

function deriveDescriptorReadiness({ jobStatus, artifactFiles, evidenceFiles }) {
  if (artifactFiles.length > 0 && evidenceFiles.length > 0) {
    return 'ready';
  }
  if (
    ['succeeded', 'manual_completed'].includes(jobStatus) &&
    (artifactFiles.length > 0 || evidenceFiles.length > 0)
  ) {
    return 'draft';
  }
  return 'missing';
}

function deriveDescriptorStatus({ jobStatus, readiness }) {
  if (['failed', 'cancelled'].includes(jobStatus)) {
    return 'rejected';
  }
  if (readiness === 'ready') {
    return 'ready';
  }
  return 'pending_blackbox';
}

async function loadLatestJobsByCharacterRequest(jobsRoot) {
  const jobRoots = await resolveJobRoots(jobsRoot);
  const jobsByCharacterRequestId = new Map();

  for (const jobRoot of jobRoots) {
    const job = await readJson(path.join(jobRoot, 'job.json'));
    const existing = jobsByCharacterRequestId.get(job.characterRequestId);
    if (!existing || existing.job.updatedAt.localeCompare(job.updatedAt) < 0) {
      jobsByCharacterRequestId.set(job.characterRequestId, { jobRoot, job });
    }
  }

  return jobsByCharacterRequestId;
}

async function copyOptionalJobFile({
  jobRoot,
  sourceRelativePath,
  packageRoot,
  targetRelativePath
}) {
  if (!sourceRelativePath) {
    return false;
  }
  const sourcePath = path.join(jobRoot, sourceRelativePath);
  if (!await pathExists(sourcePath)) {
    return false;
  }
  await copyFileEnsured(sourcePath, path.join(packageRoot, targetRelativePath));
  return true;
}

async function overlayJobIntoPackage({
  packageRoot,
  manifest,
  jobRoot,
  job
}) {
  const packageEvidenceFiles = [];
  const providerReportCopied = await copyOptionalJobFile({
    jobRoot,
    sourceRelativePath: BLACKBOX_PROVIDER_REPORT_FILE,
    packageRoot,
    targetRelativePath: 'evidence/provider_report.json'
  });
  if (providerReportCopied) {
    packageEvidenceFiles.push('evidence/provider_report.json');
  }

  await copyOptionalJobFile({
    jobRoot,
    sourceRelativePath: job.outputs?.layerPlanFile ?? BLACKBOX_LAYER_PLAN_FILE,
    packageRoot,
    targetRelativePath: 'blackbox/layer_plan.json'
  });
  await copyOptionalJobFile({
    jobRoot,
    sourceRelativePath: job.outputs?.slotMapFile ?? BLACKBOX_SLOT_MAP_FILE,
    packageRoot,
    targetRelativePath: 'blackbox/slot_map.json'
  });
  await copyOptionalJobFile({
    jobRoot,
    sourceRelativePath: job.outputs?.variantPlanFile ?? BLACKBOX_VARIANT_PLAN_FILE,
    packageRoot,
    targetRelativePath: 'blackbox/variant_plan.json'
  });

  const componentsRoot = path.join(packageRoot, manifest.componentsDir);
  const entries = await fs.readdir(componentsRoot, { withFileTypes: true });

  for (const entry of entries.filter(item => item.isDirectory())) {
    const componentId = entry.name;
    const descriptorPath = path.join(componentsRoot, componentId, 'descriptor.json');
    const descriptor = await readJson(descriptorPath);
    const slotName = descriptor.slotName;
    const artifactEntry = job.outputs?.componentArtifacts?.[slotName] ?? null;
    const sourceArtifactFile = resolveArtifactFile(artifactEntry);
    const targetArtifactFile = path.posix.join(
      manifest.componentsDir,
      componentId,
      'render.png'
    );
    const targetArtifactPath = path.join(packageRoot, targetArtifactFile);
    const sourceArtifactPath = sourceArtifactFile
      ? path.join(jobRoot, sourceArtifactFile)
      : null;

    let artifactFiles = [];
    if (sourceArtifactPath && await pathExists(sourceArtifactPath)) {
      await copyFileEnsured(sourceArtifactPath, targetArtifactPath);
      artifactFiles = [targetArtifactFile];
    } else {
      await fs.rm(targetArtifactPath, { force: true });
    }

    const evidenceFiles = [...packageEvidenceFiles];
    const readiness = deriveDescriptorReadiness({
      jobStatus: job.status,
      artifactFiles,
      evidenceFiles
    });

    await writeJson(
      descriptorPath,
      {
        ...descriptor,
        status: deriveDescriptorStatus({ jobStatus: job.status, readiness }),
        artifactFiles,
        blackboxJobId: job.jobId,
        providerType: job.providerType,
        providerName: job.providerName,
        readiness,
        reviewStatus: 'unreviewed',
        evidenceFiles
      }
    );
  }
}

export async function collectBlackboxResults({
  requestsRoot,
  jobsRoot,
  packagesRoot
}) {
  if (!requestsRoot) {
    throw new Error('缺少 requestsRoot');
  }
  if (!jobsRoot) {
    throw new Error('缺少 jobsRoot');
  }
  if (!packagesRoot) {
    throw new Error('缺少 packagesRoot');
  }

  const buildResult = await buildRequestPackage({
    requestsRoot,
    outputRoot: packagesRoot
  });
  const jobsByCharacterRequestId = await loadLatestJobsByCharacterRequest(jobsRoot);

  for (const pkg of buildResult.packages) {
    const manifest = await readJson(path.join(pkg.packageRoot, 'package_manifest.json'));
    const matchedJob = jobsByCharacterRequestId.get(manifest.characterRequestId);
    if (!matchedJob) {
      continue;
    }
    await overlayJobIntoPackage({
      packageRoot: pkg.packageRoot,
      manifest,
      jobRoot: matchedJob.jobRoot,
      job: matchedJob.job
    });
  }

  return buildResult;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const requestsRoot = process.argv[2] ?? path.resolve(process.cwd(), 'workspace', 'requests');
  const jobsRoot = process.argv[3] ?? path.resolve(process.cwd(), 'workspace', 'blackbox_jobs');
  const packagesRoot = process.argv[4] ?? path.resolve(process.cwd(), 'workspace', 'packages');
  const result = await collectBlackboxResults({ requestsRoot, jobsRoot, packagesRoot });
  console.log(`COLLECT BLACKBOX RESULTS OK packages=${result.packages.length} output=${result.outputRoot}`);
}
