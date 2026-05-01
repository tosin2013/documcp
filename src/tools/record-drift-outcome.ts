/**
 * `record_drift_outcome` MCP tool (Issue #114, ADR-012 Phase 4).
 *
 * Hosts call this after acting on (or dismissing) a drift surfaced by
 * `detectDriftWithPriority*`. The outcome lands in the KG as a
 * `drift_outcome` node + `has_drift_outcome` edge against the project, and
 * subsequent `getCalibratedWeights()` invocations reshape priority scoring
 * to favour factors that historically correlated with `actionable` drifts
 * for this project.
 *
 * The tool is intentionally narrow:
 *   - input  : { projectPath, driftId, outcome, notes? }
 *   - output : { driftId, outcome, recordedAt, summary }
 *
 * `summary` is a compact `DriftFeedbackSummary` so the host can immediately
 * reason about its calibration progress (e.g. "is the loop closed yet?")
 * without making a follow-up KG query.
 */

import { z } from "zod";
import { formatMCPResponse, MCPContentWrapper } from "../types/api.js";
import {
  recordDriftOutcome,
  getDriftFeedbackSummary,
  type DriftOutcome,
  type DriftFeedbackSummary,
} from "../memory/kg-drift-feedback.js";

export const recordDriftOutcomeSchema = z.object({
  projectPath: z
    .string()
    .min(1)
    .describe(
      "Absolute path to the project root. Must match the path used during drift detection so the outcome lands on the right project node.",
    ),
  driftId: z
    .string()
    .min(1)
    .describe(
      "The driftId returned alongside a PrioritizedDriftResult. Without this anchor the outcome can't be attributed to a specific factor snapshot.",
    ),
  outcome: z
    .enum(["actionable", "noise", "deferred"])
    .describe(
      "User judgment: 'actionable' (drift was real, doc update needed), 'noise' (false positive, dismiss), or 'deferred' (revisit later — neutral signal).",
    ),
  notes: z
    .string()
    .optional()
    .describe(
      "Optional free-form notes from the host (why the drift was actionable/noise, link to PR, etc.).",
    ),
});

export type RecordDriftOutcomeArgs = z.infer<typeof recordDriftOutcomeSchema>;

export interface RecordDriftOutcomeResponseData {
  driftId: string;
  outcome: DriftOutcome;
  recordedAt: string;
  notes?: string;
  summary: DriftFeedbackSummary;
}

/**
 * Handler entry point. Validates input, persists the outcome, and returns a
 * compact summary so the host can update its UI without a follow-up call.
 */
export async function handleRecordDriftOutcome(
  args: unknown,
): Promise<MCPContentWrapper> {
  const startedAt = Date.now();
  const parsed = recordDriftOutcomeSchema.safeParse(args);

  if (!parsed.success) {
    return formatMCPResponse(
      {
        success: false,
        error: {
          code: "INVALID_INPUT",
          message: `Invalid arguments: ${parsed.error.message}`,
          resolution:
            "Pass { projectPath, driftId, outcome: 'actionable'|'noise'|'deferred', notes? }.",
        },
        metadata: {
          toolVersion: "1.0.0",
          executionTime: Date.now() - startedAt,
          timestamp: new Date().toISOString(),
        },
      },
      { fullResponse: true },
    );
  }

  const { projectPath, driftId, outcome, notes } = parsed.data;

  try {
    const record = await recordDriftOutcome(projectPath, driftId, outcome, {
      notes,
    });
    const summary = await getDriftFeedbackSummary(projectPath);

    const data: RecordDriftOutcomeResponseData = {
      driftId: record.driftId,
      outcome: record.outcome,
      recordedAt: record.recordedAt,
      notes: record.notes,
      summary,
    };

    return formatMCPResponse(
      {
        success: true,
        data,
        recommendations:
          summary.totalOutcomes < 3
            ? [
                {
                  type: "info",
                  title: "Calibration not yet active",
                  description: `Recorded ${summary.totalOutcomes} outcome(s); calibration kicks in at 3 actionable+noise outcomes.`,
                },
              ]
            : [
                {
                  type: "info",
                  title: "Calibration active",
                  description: `Priority weights now reflect ${summary.actionable} actionable / ${summary.noise} noise outcomes for this project.`,
                },
              ],
        metadata: {
          toolVersion: "1.0.0",
          executionTime: Date.now() - startedAt,
          timestamp: new Date().toISOString(),
        },
      },
      { fullResponse: true },
    );
  } catch (error) {
    const message = (error as Error).message ?? String(error);
    const isMissingEvent = /No drift event found/i.test(message);
    return formatMCPResponse(
      {
        success: false,
        error: {
          code: isMissingEvent ? "DRIFT_NOT_FOUND" : "RECORD_FAILED",
          message,
          resolution: isMissingEvent
            ? "Run detectDriftWithPriority({ projectPath, useCalibration }) first, then pass the returned driftId."
            : "Inspect server logs for the underlying KG persistence error.",
        },
        metadata: {
          toolVersion: "1.0.0",
          executionTime: Date.now() - startedAt,
          timestamp: new Date().toISOString(),
        },
      },
      { fullResponse: true },
    );
  }
}
