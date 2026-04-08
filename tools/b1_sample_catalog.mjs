const OFFICIAL_BRANCH = '4.2';
const OFFICIAL_RAW_BASE = `https://raw.githubusercontent.com/EsotericSoftware/spine-runtimes/${OFFICIAL_BRANCH}`;

function rawUrl(relativePath) {
  return `${OFFICIAL_RAW_BASE}/${relativePath}`;
}

export const B1_BUNDLE_ID = 'b1_official_samples';
export const B1_BUNDLE_VERSION = '0.1.0';
export const PRESENTATION_CATALOG_SCHEMA_VERSION = 'presentation_catalog_v1';
export const SPINE_BUNDLE_MANIFEST_SCHEMA_VERSION = 'spine_bundle_manifest_v1';
export const SPINE_CHARACTER_MANIFEST_SCHEMA_VERSION = 'spine_character_manifest_v2';

export const OFFICIAL_SAMPLE_CATALOG = [
  {
    sampleId: 'spineboy',
    role: 'player',
    presentationId: 'spineboy',
    sourceDir: 'examples/spineboy/export',
    assets: {
      skeleton: {
        sourceName: 'spineboy-pro.json',
        outputName: 'spineboy.json',
        url: rawUrl('examples/spineboy/export/spineboy-pro.json')
      },
      atlas: {
        sourceName: 'spineboy-pma.atlas',
        outputName: 'spineboy.atlas',
        url: rawUrl('examples/spineboy/export/spineboy-pma.atlas')
      },
      textures: [
        {
          sourceName: 'spineboy-pma.png',
          outputName: 'spineboy.png',
          url: rawUrl('examples/spineboy/export/spineboy-pma.png')
        }
      ],
      license: {
        sourceName: 'license.txt',
        outputName: 'LICENSE.txt',
        url: rawUrl('examples/spineboy/license.txt')
      }
    },
    anchorProfile: { x: 0.5, y: 1.0 },
    scaleProfile: { baseScale: 1.0 }
  },
  {
    sampleId: 'raptor',
    role: 'enemy',
    presentationId: 'raptor',
    sourceDir: 'examples/raptor/export',
    assets: {
      skeleton: {
        sourceName: 'raptor-pro.json',
        outputName: 'raptor.json',
        url: rawUrl('examples/raptor/export/raptor-pro.json')
      },
      atlas: {
        sourceName: 'raptor-pma.atlas',
        outputName: 'raptor.atlas',
        url: rawUrl('examples/raptor/export/raptor-pma.atlas')
      },
      textures: [
        {
          sourceName: 'raptor-pma.png',
          outputName: 'raptor.png',
          url: rawUrl('examples/raptor/export/raptor-pma.png')
        }
      ],
      license: {
        sourceName: 'license.txt',
        outputName: 'LICENSE.txt',
        url: rawUrl('examples/raptor/license.txt')
      }
    },
    anchorProfile: { x: 0.5, y: 1.0 },
    scaleProfile: { baseScale: 1.0 }
  }
];

export function getOfficialSampleCatalog() {
  return OFFICIAL_SAMPLE_CATALOG.map(sample => structuredClone(sample));
}

export function getSampleByPresentationId(presentationId, sampleCatalog = OFFICIAL_SAMPLE_CATALOG) {
  return sampleCatalog.find(sample => sample.presentationId === presentationId) || null;
}

export function listSampleAssets(sample) {
  const assets = [sample.assets.skeleton, sample.assets.atlas, ...sample.assets.textures];
  if (sample.assets.license) assets.push(sample.assets.license);
  return assets;
}
