import path from 'node:path';

import { validateSampleBundle } from './validate_sample_bundle.mjs';

export async function validateRequestBundle({ bundleRoot }) {
  return validateSampleBundle({ bundleRoot });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const bundleRoot =
    process.argv[2] ?? path.resolve(process.cwd(), 'workspace', 'exports', 'request_driven_bundle');
  const report = await validateRequestBundle({ bundleRoot });
  console.log(`VALIDATE REQUEST BUNDLE OK characters=${report.checkedCharacters} bundle=${report.bundleId}`);
}
