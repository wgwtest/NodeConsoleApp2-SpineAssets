import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

import { getOfficialSampleCatalog, listSampleAssets } from './b1_sample_catalog.mjs';

const execFileAsync = promisify(execFile);

function getFetch(fetchImpl) {
  const resolved = fetchImpl || globalThis.fetch;
  if (!resolved) {
    throw new Error('当前 Node 环境不支持 fetch');
  }
  return resolved;
}

async function curlDownload(url) {
  const { stdout } = await execFileAsync('curl', ['-fsSL', url], {
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024
  });
  return Buffer.from(stdout);
}

async function downloadViaFetch(url, fetchImpl) {
  const response = await getFetch(fetchImpl)(url);
  if (!response.ok) {
    throw new Error(`下载失败 status=${response.status} url=${url}`);
  }

  const bytes = await response.arrayBuffer();
  return Buffer.from(bytes);
}

async function downloadBuffer(url, { fetchImpl, downloadBinary } = {}) {
  try {
    return await downloadViaFetch(url, fetchImpl);
  } catch (error) {
    if (downloadBinary) {
      return Buffer.from(await downloadBinary(url));
    }

    return curlDownload(url).catch(curlError => {
      const details = error?.message || String(error);
      throw new Error(`下载失败 url=${url} fetchError=${details} curlError=${curlError.message}`);
    });
  }
}

export async function fetchOfficialSamples({
  outputRoot,
  sampleCatalog = getOfficialSampleCatalog(),
  fetchImpl,
  downloadBinary
}) {
  if (!outputRoot) {
    throw new Error('缺少 outputRoot');
  }

  const resolvedOutputRoot = path.resolve(outputRoot);
  await fs.mkdir(resolvedOutputRoot, { recursive: true });
  const samples = [];

  for (const sample of sampleCatalog) {
    const sampleDir = path.join(resolvedOutputRoot, sample.presentationId);
    await fs.rm(sampleDir, { recursive: true, force: true });
    await fs.mkdir(sampleDir, { recursive: true });

    const files = [];
    for (const asset of listSampleAssets(sample)) {
      const content = await downloadBuffer(asset.url, { fetchImpl, downloadBinary });
      const targetFile = path.join(sampleDir, asset.sourceName);
      await fs.writeFile(targetFile, content);
      files.push(targetFile);
    }

    samples.push({
      presentationId: sample.presentationId,
      sampleDir,
      files
    });
  }

  return {
    outputRoot: resolvedOutputRoot,
    samples
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const outputRoot = path.resolve(process.cwd(), 'workspace', 'samples', 'official');
  const result = await fetchOfficialSamples({ outputRoot });
  console.log(`FETCH OK samples=${result.samples.length} output=${result.outputRoot}`);
}
