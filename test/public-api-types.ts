import type { SvgElementRecord, SvgSemanticMergeEvidence, SvgSemanticTree } from '../dist/index.js';
import { createSvgSemanticMergeEvidence, parseSvgSemanticTree } from '../dist/index.js';

const tree: SvgSemanticTree = parseSvgSemanticTree('<svg />');
const evidence: SvgSemanticMergeEvidence = createSvgSemanticMergeEvidence('<svg />');
const first: SvgElementRecord | undefined = tree.records[0];

tree.kind satisfies 'frontier.lang.svgSemanticTree';
evidence.kind satisfies 'frontier.lang.svgSemanticMergeEvidence';
first?.identityKey satisfies string | undefined;
