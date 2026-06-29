import { parseSvgSemanticTree } from '../dist/index.js';

const shapes = Array.from({ length: 100 }, (_, index) => `<rect id="r${index}" fill="url(#g)" />`).join('');
const start = performance.now();
const tree = parseSvgSemanticTree(`<svg><defs><linearGradient id="g" /></defs>${shapes}</svg>`);
const durationMs = performance.now() - start;
console.log(JSON.stringify({ package: '@shapeshift-labs/frontier-lang-svg', records: tree.records.length, durationMs: Number(durationMs.toFixed(3)) }));
