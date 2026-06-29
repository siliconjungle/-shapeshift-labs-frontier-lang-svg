export interface SourceSpan {
  readonly startOffset?: number;
  readonly endOffset?: number;
  readonly startLine?: number;
  readonly startColumn?: number;
  readonly endLine?: number;
  readonly endColumn?: number;
}

export interface SvgProofGap {
  readonly code: string;
  readonly status: 'not-claimed';
  readonly summary: string;
  readonly failClosed: true;
  readonly semanticEquivalenceClaim: false;
  readonly runtimeEquivalenceClaim: false;
  readonly sourceSpan?: SourceSpan;
}

export interface SvgElementRecord {
  readonly kind: 'element';
  readonly tagName: string;
  readonly path: readonly string[];
  readonly ordinal: number;
  readonly identityKey: string;
  readonly attributes: Readonly<Record<string, string | true>>;
  readonly sourceSpan?: SourceSpan;
  readonly sourceHash?: string;
  readonly attributeHash?: string;
  readonly proofGaps?: readonly SvgProofGap[];
}

export interface SvgDefinitionRecord {
  readonly id: string;
  readonly tagName: string;
  readonly elementPath: readonly string[];
  readonly sourceSpan?: SourceSpan;
}

export interface SvgReferenceRecord {
  readonly targetId: string;
  readonly attributeName: string;
  readonly attributeValue: string;
  readonly elementPath: readonly string[];
  readonly sourceSpan?: SourceSpan;
}

export interface SvgReferenceGraph {
  readonly definitions: readonly SvgDefinitionRecord[];
  readonly references: readonly SvgReferenceRecord[];
  readonly missingReferences: readonly SvgReferenceRecord[];
  readonly duplicateDefinitions: readonly SvgDefinitionRecord[];
}

export interface SvgSemanticTree {
  readonly kind: 'frontier.lang.svgSemanticTree';
  readonly version: 1;
  readonly sourcePath?: string;
  readonly sourceHash: string;
  readonly treeHash: string;
  readonly records: readonly SvgElementRecord[];
  readonly referenceGraph: SvgReferenceGraph;
  readonly proofGaps: readonly SvgProofGap[];
  readonly parser: { readonly status: 'ok' | 'failed'; readonly errors: readonly string[] };
  readonly summary: ReturnType<typeof summarizeSvgSemanticTree>;
}

export interface SvgSemanticMergeEvidence {
  readonly kind: 'frontier.lang.svgSemanticMergeEvidence';
  readonly version: 1;
  readonly status: 'ready' | 'needs-review';
  readonly sourcePath?: string;
  readonly sourceHash: string;
  readonly treeHash: string;
  readonly records: readonly SvgElementRecord[];
  readonly referenceGraph: SvgReferenceGraph;
  readonly proofGaps: readonly SvgProofGap[];
  readonly summary: ReturnType<typeof summarizeSvgSemanticTree>;
  readonly autoMergeClaim: false;
  readonly semanticEquivalenceClaim: false;
  readonly browserPaintEquivalenceClaim: false;
  readonly browserRuntimeEquivalenceClaim: false;
}

export function parseSvgSemanticTree(sourceText: string, options?: Record<string, unknown>): SvgSemanticTree;
export function createSvgSemanticMergeEvidence(sourceText: string, options?: Record<string, unknown>): SvgSemanticMergeEvidence;
export function querySvgReferenceGraph(tree: Pick<SvgSemanticTree, 'referenceGraph'>): SvgReferenceGraph;
export function summarizeSvgSemanticTree(tree: Pick<SvgSemanticTree, 'records' | 'referenceGraph' | 'proofGaps' | 'parser'>): {
  readonly elements: number;
  readonly definitionRecords: number;
  readonly referenceRecords: number;
  readonly missingReferences: number;
  readonly duplicateDefinitions: number;
  readonly proofGaps: number;
  readonly parseErrors: number;
};
