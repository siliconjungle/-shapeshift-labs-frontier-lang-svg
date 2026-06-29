# @shapeshift-labs/frontier-lang-svg

Runtime-neutral SVG semantic merge evidence for Frontier Lang.

This package parses SVG source into source-bound records for elements, stable identity keys, attributes, local `id` definitions, `url(#id)` and `href="#id"` references, and fail-closed runtime proof gaps. It does not claim browser paint, animation timing, external resource loading, CSS cascade, script execution, or layout equivalence by itself.

```js
import { createSvgSemanticMergeEvidence } from '@shapeshift-labs/frontier-lang-svg';

const evidence = createSvgSemanticMergeEvidence(
  '<svg><defs><linearGradient id="g" /></defs><rect fill="url(#g)" /></svg>',
  { sourcePath: 'icon.svg' }
);

console.log(evidence.summary.referenceRecords);
console.log(evidence.referenceGraph.missingReferences);
```

## Boundary

`frontier-lang-svg` owns SVG source identity and reference evidence. JSX embedding, HTML embedding, CSS cascade interaction, browser probes, and final project-level merge admission stay in `@shapeshift-labs/frontier-lang-compiler` and adjacent runtime proof packages.
