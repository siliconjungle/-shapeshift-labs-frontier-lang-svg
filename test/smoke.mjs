import assert from 'node:assert/strict';
import { createSvgSemanticMergeEvidence, parseSvgSemanticTree, querySvgReferenceGraph } from '../dist/index.js';

const source = '<svg><defs><linearGradient id="g" /></defs><rect fill="url(#g)" /><use href="#missing" /></svg>';
const tree = parseSvgSemanticTree(source, { sourcePath: 'icon.svg' });
assert.equal(tree.parser.status, 'ok');
assert.equal(tree.summary.elements, 5);
assert.equal(tree.summary.definitionRecords, 1);
assert.equal(tree.summary.referenceRecords, 2);
assert.equal(querySvgReferenceGraph(tree).missingReferences[0].targetId, 'missing');

const evidence = createSvgSemanticMergeEvidence(source, { sourcePath: 'icon.svg' });
assert.equal(evidence.kind, 'frontier.lang.svgSemanticMergeEvidence');
assert.equal(evidence.status, 'needs-review');
assert.equal(evidence.summary.missingReferences, 1);
