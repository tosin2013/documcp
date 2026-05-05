/**
 * Drift Feedback Knowledge Graph Helpers (Issue #114, ADR-012 Phase 4).
 *
 * The host LLM observes a drift, decides whether the recommendation was
 * useful, then records the outcome via the `record_drift_outcome` MCP tool.
 * Those outcomes feed back into the priority-scoring weights so the model
 * learns which factors actually correlate with actionable drifts for this
 * project.
 *
 * Persistence layout in the KG:
 *
 *   project:<hash>
 *     ──has_drift_event──>      drift_event:<projectHash>:<driftId>
 *                                  └ properties: filePath, severity, factors, detectedAt
 *
 *     ──has_drift_outcome──>    drift_outcome:<projectHash>:<driftId>:<recordedAt>
 *                                  └ properties: outcome, recordedAt, notes?, driftId
 *
 * Drift events are written *every* time `detectDriftWithPriority*` runs
 * (idempotent on driftId). Outcomes accumulate one per call to
 * `record_drift_outcome` — multiple outcomes for the same driftId are
 * permitted (e.g. user revises judgment) and the most recent wins for
 * calibration purposes.
 */

import crypto from "crypto";
import {
  getKnowledgeGraph,
  getKGStorage,
  saveKnowledgeGraph,
} from "./kg-integration.js";

export type DriftOutcome = "actionable" | "noise" | "deferred";

export interface DriftFactorSnapshot {
  codeComplexity: number;
  usageFrequency: number;
  changeMagnitude: number;
  documentationCoverage: number;
  staleness: number;
  userFeedback: number;
}

export interface DriftEventRecord {
  driftId: string;
  filePath: string;
  severity: "critical" | "high" | "medium" | "low";
  recommendation: "critical" | "high" | "medium" | "low";
  overallScore: number;
  factors: DriftFactorSnapshot;
  detectedAt: string;
}

export interface DriftOutcomeRecord {
  driftId: string;
  outcome: DriftOutcome;
  recordedAt: string;
  notes?: string;
}

export interface DriftFeedbackEntry {
  event: DriftEventRecord;
  outcome: DriftOutcomeRecord;
}

export interface DriftFeedbackSummary {
  totalOutcomes: number;
  actionable: number;
  noise: number;
  deferred: number;
  recent: DriftFeedbackEntry[];
}

/**
 * Stable project ID derivable from a project path. Mirrors
 * `freshness-kg-integration.generateProjectId` so both subsystems land on the
 * same project node.
 */
export function generateProjectId(projectPath: string): string {
  const hash = crypto
    .createHash("sha256")
    .update(projectPath)
    .digest("hex")
    .substring(0, 16);
  return `project:${hash}`;
}

function projectHashFromId(projectId: string): string {
  return projectId.replace(/^project:/, "");
}

function driftEventNodeId(projectId: string, driftId: string): string {
  return `drift_event:${projectHashFromId(projectId)}:${driftId}`;
}

function driftOutcomeNodeId(
  projectId: string,
  driftId: string,
  recordedAt: string,
): string {
  // Outcome nodes are NOT idempotent on driftId — multiple outcomes per drift
  // are permitted and we tiebreak by ISO timestamp.
  return `drift_outcome:${projectHashFromId(
    projectId,
  )}:${driftId}:${recordedAt}`;
}

/**
 * Generate a deterministic drift ID for a (filePath, codeChange) pair.
 *
 * We keep this deterministic so the same drift between the same two snapshots
 * produces the same ID across runs — the tool needs this to correlate the
 * host's outcome callback with the original detection.
 */
export function generateDriftId(
  filePath: string,
  changedSymbols: string[],
  detectedAtIso: string,
): string {
  const normalizedSymbols = [...changedSymbols].sort().join(",");
  return crypto
    .createHash("sha256")
    .update(`${filePath}|${normalizedSymbols}|${detectedAtIso}`)
    .digest("hex")
    .substring(0, 16);
}

/**
 * Persist (or refresh) a drift event in the KG. Idempotent on the
 * (projectId, driftId) pair — re-running detection over the same drift
 * updates the most recent factor snapshot rather than creating duplicates.
 */
export async function storeDriftEvent(
  projectPath: string,
  event: DriftEventRecord,
): Promise<string> {
  const kg = await getKnowledgeGraph();
  const projectId = generateProjectId(projectPath);
  const eventId = driftEventNodeId(projectId, event.driftId);

  kg.addNode({
    id: eventId,
    type: "drift_event",
    label: `drift:${event.filePath}`,
    properties: {
      driftId: event.driftId,
      projectPath,
      filePath: event.filePath,
      severity: event.severity,
      recommendation: event.recommendation,
      overallScore: event.overallScore,
      factors: event.factors,
      detectedAt: event.detectedAt,
    },
    weight: 1.0,
  });

  kg.addEdge({
    source: projectId,
    target: eventId,
    type: "has_drift_event",
    weight: 1.0,
    confidence: 1.0,
    properties: {
      driftId: event.driftId,
      detectedAt: event.detectedAt,
    },
  });

  await saveKnowledgeGraph();
  return eventId;
}

/**
 * Record an outcome for a previously-detected drift. The drift event must
 * already exist (i.e. the host should call `record_drift_outcome` after a
 * drift was surfaced via `detectDriftWithPriority*`); we throw with a clear
 * message otherwise so the caller can react.
 */
export async function recordDriftOutcome(
  projectPath: string,
  driftId: string,
  outcome: DriftOutcome,
  options: { notes?: string; recordedAt?: string } = {},
): Promise<DriftOutcomeRecord> {
  const kg = await getKnowledgeGraph();
  const projectId = generateProjectId(projectPath);
  const eventId = driftEventNodeId(projectId, driftId);

  // Verify the originating event exists. Without it, calibration can't
  // attribute factor weights — better to fail loud than silently train on
  // anchorless data.
  const eventNode = await kg.findNode({
    type: "drift_event",
    properties: { driftId },
  });
  if (!eventNode || eventNode.id !== eventId) {
    throw new Error(
      `No drift event found for driftId="${driftId}" under project ${projectPath}. ` +
        `Run detectDriftWithPriority first, or pass the driftId returned from that call.`,
    );
  }

  const recordedAt = options.recordedAt ?? new Date().toISOString();
  const outcomeId = driftOutcomeNodeId(projectId, driftId, recordedAt);

  kg.addNode({
    id: outcomeId,
    type: "drift_outcome",
    label: `outcome:${outcome}`,
    properties: {
      driftId,
      outcome,
      recordedAt,
      notes: options.notes,
      projectPath,
    },
    weight: 1.0,
  });

  kg.addEdge({
    source: projectId,
    target: outcomeId,
    type: "has_drift_outcome",
    weight: 1.0,
    confidence: 1.0,
    properties: {
      driftId,
      outcome,
      recordedAt,
    },
  });

  // Also link the outcome back to the original event so traversal queries
  // (e.g. "show all outcomes for drift X") are O(1) without a properties
  // scan over every outcome node.
  kg.addEdge({
    source: eventId,
    target: outcomeId,
    type: "results_in",
    weight: 1.0,
    confidence: 1.0,
    properties: {
      outcome,
      recordedAt,
    },
  });

  await saveKnowledgeGraph();

  return {
    driftId,
    outcome,
    recordedAt,
    notes: options.notes,
  };
}

/**
 * Read every (event, outcome) pair recorded for a project, newest-first.
 *
 * If a drift has multiple outcomes (host changed their mind), we surface the
 * latest one here — that's the version the calibrator trusts. The full
 * outcome trail remains queryable via the raw KG for audit purposes.
 */
export async function getDriftFeedbackHistory(
  projectPath: string,
): Promise<DriftFeedbackEntry[]> {
  const kg = await getKnowledgeGraph();
  const projectId = generateProjectId(projectPath);

  const eventEdges = await kg.findEdges({
    source: projectId,
    type: "has_drift_event",
  });

  if (eventEdges.length === 0) {
    return [];
  }

  // Build driftId -> latest event node lookup. Re-detection of the same
  // drift refreshes the node in place, so addNode is idempotent here.
  const allNodes = await kg.getAllNodes();
  const nodesById = new Map(allNodes.map((n) => [n.id, n]));

  const entries: DriftFeedbackEntry[] = [];
  for (const eventEdge of eventEdges) {
    const eventNode = nodesById.get(eventEdge.target);
    if (!eventNode || eventNode.type !== "drift_event") continue;

    const outcomeEdges = await kg.findEdges({
      source: eventNode.id,
      type: "results_in",
    });
    if (outcomeEdges.length === 0) continue;

    let latestOutcomeNode = null;
    let latestRecordedAt = "";
    for (const outcomeEdge of outcomeEdges) {
      const candidate = nodesById.get(outcomeEdge.target);
      if (!candidate || candidate.type !== "drift_outcome") continue;
      const recordedAt = candidate.properties.recordedAt as string;
      if (recordedAt > latestRecordedAt) {
        latestRecordedAt = recordedAt;
        latestOutcomeNode = candidate;
      }
    }

    if (!latestOutcomeNode) continue;

    entries.push({
      event: {
        driftId: eventNode.properties.driftId as string,
        filePath: eventNode.properties.filePath as string,
        severity: eventNode.properties.severity,
        recommendation: eventNode.properties.recommendation,
        overallScore: eventNode.properties.overallScore as number,
        factors: eventNode.properties.factors as DriftFactorSnapshot,
        detectedAt: eventNode.properties.detectedAt as string,
      },
      outcome: {
        driftId: latestOutcomeNode.properties.driftId as string,
        outcome: latestOutcomeNode.properties.outcome as DriftOutcome,
        recordedAt: latestOutcomeNode.properties.recordedAt as string,
        notes: latestOutcomeNode.properties.notes as string | undefined,
      },
    });
  }

  // Newest first.
  entries.sort((a, b) =>
    a.outcome.recordedAt < b.outcome.recordedAt ? 1 : -1,
  );

  return entries;
}

/**
 * Compact summary suitable for embedding in `getDeploymentRecommendations()`
 * output — gives downstream consumers a one-glance view of feedback health
 * without forcing them to walk the KG.
 */
export async function getDriftFeedbackSummary(
  projectPath: string,
  recentLimit = 10,
): Promise<DriftFeedbackSummary> {
  const history = await getDriftFeedbackHistory(projectPath);

  let actionable = 0;
  let noise = 0;
  let deferred = 0;
  for (const entry of history) {
    if (entry.outcome.outcome === "actionable") actionable += 1;
    else if (entry.outcome.outcome === "noise") noise += 1;
    else if (entry.outcome.outcome === "deferred") deferred += 1;
  }

  return {
    totalOutcomes: history.length,
    actionable,
    noise,
    deferred,
    recent: history.slice(0, recentLimit),
  };
}

/**
 * Persist storage helper used by some callers that prefer an explicit flush
 * instead of the implicit save inside `storeDriftEvent` /
 * `recordDriftOutcome` (e.g. when batching multiple events in tests).
 */
export async function flushDriftFeedback(): Promise<void> {
  const kg = await getKnowledgeGraph();
  const storage = await getKGStorage();
  const nodes = await kg.getAllNodes();
  const edges = await kg.getAllEdges();
  await storage.saveGraph(nodes, edges);
}
