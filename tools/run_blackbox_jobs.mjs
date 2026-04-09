import path from 'node:path';

import { runProvider } from './lib/blackbox_providers.mjs';
import { readJson, resolveJobRoots, writeJson } from './lib/blackbox_shared.mjs';

export async function runBlackboxJobs({
  jobsRoot,
  providerType = null,
  providerName = null
}) {
  const jobRoots = await resolveJobRoots(jobsRoot);
  const jobs = [];

  for (const jobRoot of jobRoots) {
    const jobPath = path.join(jobRoot, 'job.json');
    const job = await readJson(jobPath);
    const nextJob = {
      ...job,
      providerType: providerType ?? job.providerType,
      providerName: providerName ?? job.providerName
    };
    const updatedJob = await runProvider({ jobRoot, job: nextJob });
    await writeJson(jobPath, updatedJob);
    jobs.push({
      jobId: updatedJob.jobId,
      jobRoot,
      presentationId: updatedJob.presentationId,
      characterRequestId: updatedJob.characterRequestId,
      providerType: updatedJob.providerType,
      providerName: updatedJob.providerName,
      status: updatedJob.status
    });
  }

  jobs.sort((left, right) => left.jobId.localeCompare(right.jobId));

  return {
    jobsRoot: path.resolve(jobsRoot),
    jobs
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const jobsRoot = process.argv[2] ?? path.resolve(process.cwd(), 'workspace', 'blackbox_jobs');
  const providerType = process.argv[3] ?? null;
  const providerName = process.argv[4] ?? providerType;
  const result = await runBlackboxJobs({ jobsRoot, providerType, providerName });
  console.log(`RUN BLACKBOX JOBS OK count=${result.jobs.length} root=${result.jobsRoot}`);
}
