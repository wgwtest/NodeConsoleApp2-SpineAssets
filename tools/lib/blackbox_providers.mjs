import { runCloudStubProvider } from './cloud_stub_provider.mjs';
import { runManualProvider } from './manual_provider.mjs';

const PROVIDER_RUNNERS = {
  manual: runManualProvider,
  cloud_stub: runCloudStubProvider
};

export function resolveProviderRunner(providerType) {
  const runner = PROVIDER_RUNNERS[providerType];
  if (!runner) {
    throw new Error(`未知 providerType: ${providerType}`);
  }
  return runner;
}

export async function runProvider({ jobRoot, job }) {
  return resolveProviderRunner(job.providerType)({ jobRoot, job });
}
