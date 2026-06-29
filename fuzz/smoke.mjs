import assert from 'node:assert/strict';
import { createSvgSemanticMergeEvidence } from '../dist/index.js';

for (const tag of ['rect', 'circle', 'path']) {
  const evidence = createSvgSemanticMergeEvidence(`<svg><${tag} id="${tag}" /></svg>`);
  assert.equal(evidence.summary.elements, 2);
  assert.equal(evidence.summary.definitionRecords, 1);
}
