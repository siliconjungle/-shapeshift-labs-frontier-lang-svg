import { hashSemanticValue } from '@shapeshift-labs/frontier-lang-kernel';

const RuntimeTags = new Set(['script', 'foreignObject', 'animate', 'animateTransform', 'animateMotion', 'set', 'discard']);

export function parseSvgSemanticTree(sourceText, options = {}) {
  const sourceHash = options.sourceHash ?? hashSemanticValue({ kind: 'frontier.lang.svg.source.v1', sourceText });
  const lineStarts = computeLineStarts(sourceText);
  const records = [];
  const definitions = [];
  const references = [];
  const proofGaps = [];
  const parserErrors = [];
  const stack = [{ tagName: '#root', path: [], childCounts: new Map() }];
  const tokenPattern = /<!--[\s\S]*?-->|<!\[CDATA\[[\s\S]*?\]\]>|<\/?[^>]+>/g;

  for (const match of sourceText.matchAll(tokenPattern)) {
    const token = match[0];
    const offset = match.index ?? 0;
    if (token.startsWith('<!--') || token.startsWith('<![CDATA[') || token.startsWith('<?') || token.startsWith('<!')) continue;
    if (token.startsWith('</')) {
      closeElement(token, stack, parserErrors);
      continue;
    }
    const parsed = parseStartTag(token);
    if (!parsed) {
      parserErrors.push(`Unable to parse SVG tag at offset ${offset}.`);
      continue;
    }
    const parent = stack.at(-1);
    const ordinal = nextOrdinal(parent.childCounts, parsed.tagName);
    const path = [...parent.path, `${parsed.tagName}[${ordinal}]`];
    const span = sourceSpan(offset, offset + token.length, lineStarts);
    const localGaps = svgProofGaps(parsed.tagName, parsed.attributes, span);
    const identityKey = parsed.attributes.id ? `id:${parsed.attributes.id}` : parsed.attributes['data-frontier-key'] ?? path.join('/');
    const record = compactRecord({
      kind: 'element',
      tagName: parsed.tagName,
      path,
      ordinal,
      identityKey,
      attributes: parsed.attributes,
      sourceSpan: span,
      sourceHash,
      attributeHash: hashSemanticValue({ kind: 'frontier.lang.svg.attributes.v1', attributes: parsed.attributes }),
      proofGaps: localGaps.length ? localGaps : undefined
    });
    records.push(record);
    proofGaps.push(...localGaps);
    if (typeof parsed.attributes.id === 'string') definitions.push({ id: parsed.attributes.id, tagName: parsed.tagName, elementPath: path, sourceSpan: span });
    references.push(...extractSvgReferences(parsed.attributes, path, span));
    if (!parsed.selfClosing) stack.push({ tagName: parsed.tagName, path, childCounts: new Map() });
  }

  if (stack.length > 1) parserErrors.push(`Unclosed SVG element ${stack.at(-1).tagName}.`);
  const referenceGraph = createReferenceGraph(definitions, references);
  const parser = { status: parserErrors.length ? 'failed' : 'ok', errors: parserErrors };
  const parserGaps = parserErrors.map((message) => proofGap('svg-parser-recovery', message, undefined));
  return treeEnvelope(options, sourceHash, records, referenceGraph, [...proofGaps, ...parserGaps], parser);
}

export function createSvgSemanticMergeEvidence(sourceText, options = {}) {
  const tree = parseSvgSemanticTree(sourceText, options);
  return {
    kind: 'frontier.lang.svgSemanticMergeEvidence',
    version: 1,
    status: tree.proofGaps.length || tree.referenceGraph.missingReferences.length || tree.referenceGraph.duplicateDefinitions.length ? 'needs-review' : 'ready',
    sourcePath: options.sourcePath,
    sourceHash: tree.sourceHash,
    treeHash: tree.treeHash,
    records: tree.records,
    referenceGraph: tree.referenceGraph,
    proofGaps: tree.proofGaps,
    summary: tree.summary,
    autoMergeClaim: false,
    semanticEquivalenceClaim: false,
    browserPaintEquivalenceClaim: false,
    browserRuntimeEquivalenceClaim: false
  };
}

export function querySvgReferenceGraph(tree) {
  return tree.referenceGraph;
}

export function summarizeSvgSemanticTree(tree) {
  return {
    elements: (tree.records ?? []).length,
    definitionRecords: tree.referenceGraph?.definitions?.length ?? 0,
    referenceRecords: tree.referenceGraph?.references?.length ?? 0,
    missingReferences: tree.referenceGraph?.missingReferences?.length ?? 0,
    duplicateDefinitions: tree.referenceGraph?.duplicateDefinitions?.length ?? 0,
    proofGaps: (tree.proofGaps ?? []).length,
    parseErrors: (tree.parser?.errors ?? []).length
  };
}

function parseStartTag(token) {
  const match = /^<\s*([A-Za-z_][\w:.-]*)([\s\S]*?)(\/?)\s*>$/.exec(token);
  if (!match) return undefined;
  return {
    tagName: match[1],
    attributes: parseAttributes(match[2] ?? ''),
    selfClosing: /\/\s*>$/.test(token)
  };
}

function parseAttributes(text) {
  const result = {};
  const pattern = /([:@A-Za-z_][\w:.-]*)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  for (const match of text.matchAll(pattern)) result[match[1]] = match[2] ?? match[3] ?? match[4] ?? true;
  return result;
}

function closeElement(token, stack, parserErrors) {
  const tagName = token.replace(/^<\//, '').replace(/>$/, '').trim();
  for (let index = stack.length - 1; index > 0; index -= 1) {
    if (stack[index].tagName === tagName) {
      stack.length = index;
      return;
    }
  }
  parserErrors.push(`Unmatched SVG closing tag ${tagName}.`);
}

function extractSvgReferences(attributes, elementPath, sourceSpanValue) {
  const references = [];
  for (const [attributeName, rawValue] of Object.entries(attributes)) {
    if (rawValue === true) continue;
    const value = String(rawValue);
    const targets = new Set();
    for (const match of value.matchAll(/url\(\s*#([A-Za-z_][\w:.-]*)\s*\)/g)) targets.add(match[1]);
    if ((attributeName === 'href' || attributeName === 'xlink:href') && value.startsWith('#')) targets.add(value.slice(1));
    for (const targetId of targets) references.push({ targetId, attributeName, attributeValue: value, elementPath, sourceSpan: sourceSpanValue });
  }
  return references;
}

function createReferenceGraph(definitions, references) {
  const byId = new Map();
  for (const definition of definitions) {
    if (!byId.has(definition.id)) byId.set(definition.id, []);
    byId.get(definition.id).push(definition);
  }
  return {
    definitions,
    references,
    missingReferences: references.filter((reference) => !byId.has(reference.targetId)),
    duplicateDefinitions: [...byId.values()].filter((items) => items.length > 1).flat()
  };
}

function svgProofGaps(tagName, attributes, span) {
  const gaps = [];
  if (RuntimeTags.has(tagName)) gaps.push(proofGap('svg-runtime-element-boundary', `<${tagName}> requires browser/runtime evidence.`, span));
  for (const [name, rawValue] of Object.entries(attributes)) {
    const value = rawValue === true ? '' : String(rawValue);
    if (/^on/i.test(name)) gaps.push(proofGap('svg-event-handler-runtime-boundary', `SVG event handler ${name} requires runtime behavior evidence.`, span));
    if (name === 'style') gaps.push(proofGap('svg-style-attribute-cascade-boundary', 'Inline SVG style requires cascade and paint evidence.', span));
    if ((name === 'href' || name === 'xlink:href') && value && !value.startsWith('#')) gaps.push(proofGap('svg-external-resource-boundary', 'External SVG resource references require fetch/runtime evidence.', span));
    if (/url\(\s*(?!#)/.test(value)) gaps.push(proofGap('svg-external-paint-server-boundary', 'External paint-server URLs require browser/runtime evidence.', span));
  }
  return gaps;
}

function treeEnvelope(options, sourceHash, records, referenceGraph, proofGaps, parser) {
  const tree = {
    kind: 'frontier.lang.svgSemanticTree',
    version: 1,
    sourcePath: options.sourcePath,
    sourceHash,
    treeHash: hashSemanticValue({ kind: 'frontier.lang.svg.tree.v1', records: records.map(hashableElement), referenceGraph: hashableReferenceGraph(referenceGraph), proofGaps: proofGaps.map((gap) => gap.code) }),
    records,
    referenceGraph,
    proofGaps,
    parser
  };
  return { ...tree, summary: summarizeSvgSemanticTree(tree) };
}

function proofGap(code, summary, span) {
  return compactRecord({ code, status: 'not-claimed', summary, failClosed: true, semanticEquivalenceClaim: false, runtimeEquivalenceClaim: false, sourceSpan: span });
}

function sourceSpan(start, end, lineStarts) {
  const from = positionAt(start, lineStarts);
  const to = positionAt(end, lineStarts);
  return { startOffset: start, endOffset: end, startLine: from.line, startColumn: from.column, endLine: to.line, endColumn: to.column };
}

function positionAt(offset, lineStarts) {
  let line = 0;
  while (line + 1 < lineStarts.length && lineStarts[line + 1] <= offset) line += 1;
  return { line: line + 1, column: offset - lineStarts[line] + 1 };
}

function computeLineStarts(text) {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) if (text[index] === '\n') starts.push(index + 1);
  return starts;
}

function nextOrdinal(counts, key) {
  const next = (counts.get(key) ?? 0) + 1;
  counts.set(key, next);
  return next;
}

function hashableElement(record) {
  return { tagName: record.tagName, path: record.path, identityKey: record.identityKey, attributes: record.attributes, proofGaps: record.proofGaps?.map((gap) => gap.code) };
}

function hashableReferenceGraph(graph) {
  return { definitions: graph.definitions.map((item) => ({ id: item.id, tagName: item.tagName, elementPath: item.elementPath })), references: graph.references.map((item) => ({ targetId: item.targetId, attributeName: item.attributeName, elementPath: item.elementPath })), missingReferences: graph.missingReferences.map((item) => item.targetId), duplicateDefinitions: graph.duplicateDefinitions.map((item) => item.id) };
}

function compactRecord(record) {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined));
}
