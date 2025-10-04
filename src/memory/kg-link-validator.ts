/**
 * Knowledge Graph Link Validator
 * Validates external and internal links in documentation and stores results in KG
 */

import crypto from "crypto";
import { getKnowledgeGraph } from "./kg-integration.js";
import { GraphNode } from "./knowledge-graph.js";

export interface LinkValidationResult {
  url: string;
  status: "valid" | "broken" | "warning" | "unknown";
  statusCode?: number;
  errorMessage?: string;
  lastChecked: string;
  responseTime?: number;
}

export interface LinkValidationSummary {
  totalLinks: number;
  validLinks: number;
  brokenLinks: number;
  warningLinks: number;
  unknownLinks: number;
  results: LinkValidationResult[];
}

/**
 * Validate external links in documentation content
 */
export async function validateExternalLinks(
  urls: string[],
  options?: {
    timeout?: number;
    retryCount?: number;
    concurrency?: number;
  },
): Promise<LinkValidationSummary> {
  const _timeout = options?.timeout || 5000;
  // const _retryCount = options?.retryCount || 2;
  // const _concurrency = options?.concurrency || 10;

  const results: LinkValidationResult[] = [];
  const summary: LinkValidationSummary = {
    totalLinks: urls.length,
    validLinks: 0,
    brokenLinks: 0,
    warningLinks: 0,
    unknownLinks: 0,
    results: [],
  };

  // Create a temporary HTML file with all links to validate
  // const _tempHtml = `<html><body>${urls
  //   .map((url) => `<a href="${url}">${url}</a>`)
  //   .join("\n")}</body></html>`;

  try {
    // Use individual validation for now (linkinator API is complex)
    // TODO: Optimize with linkinator's batch checking in future
    for (const url of urls) {
      try {
        const result = await validateSingleLink(url, _timeout);
        results.push(result);

        if (result.status === "valid") summary.validLinks++;
        else if (result.status === "broken") summary.brokenLinks++;
        else if (result.status === "warning") summary.warningLinks++;
        else summary.unknownLinks++;
      } catch {
        results.push({
          url,
          status: "unknown",
          errorMessage: "Validation failed",
          lastChecked: new Date().toISOString(),
        });
        summary.unknownLinks++;
      }
    }
  } catch (error) {
    console.warn("Link validation error:", error);
  }

  summary.results = results;
  return summary;
}

/**
 * Validate a single link with HTTP HEAD request
 */
async function validateSingleLink(
  url: string,
  timeout: number,
): Promise<LinkValidationResult> {
  const startTime = Date.now();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const response = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    });

    clearTimeout(timeoutId);

    const responseTime = Date.now() - startTime;

    if (response.ok) {
      return {
        url,
        status: "valid",
        statusCode: response.status,
        lastChecked: new Date().toISOString(),
        responseTime,
      };
    } else {
      return {
        url,
        status: "broken",
        statusCode: response.status,
        errorMessage: `HTTP ${response.status}: ${response.statusText}`,
        lastChecked: new Date().toISOString(),
        responseTime,
      };
    }
  } catch (error: any) {
    return {
      url,
      status: "broken",
      errorMessage: error.message || "Network error",
      lastChecked: new Date().toISOString(),
    };
  }
}

/**
 * Store link validation results in Knowledge Graph
 */
export async function storeLinkValidationInKG(
  docSectionId: string,
  validationSummary: LinkValidationSummary,
): Promise<void> {
  const kg = await getKnowledgeGraph();

  // Create link validation entity
  const validationId = `link_validation:${crypto
    .randomBytes(8)
    .toString("hex")}`;

  const validationNode: GraphNode = {
    id: validationId,
    type: "link_validation",
    label: "Link Validation Result",
    properties: {
      totalLinks: validationSummary.totalLinks,
      validLinks: validationSummary.validLinks,
      brokenLinks: validationSummary.brokenLinks,
      warningLinks: validationSummary.warningLinks,
      unknownLinks: validationSummary.unknownLinks,
      healthScore:
        validationSummary.totalLinks > 0
          ? (validationSummary.validLinks / validationSummary.totalLinks) * 100
          : 100,
      lastValidated: new Date().toISOString(),
      brokenLinksList: validationSummary.results
        .filter((r) => r.status === "broken")
        .map((r) => r.url),
    },
    weight: 1.0,
    lastUpdated: new Date().toISOString(),
  };

  kg.addNode(validationNode);

  // Create relationship: documentation_section -> link_validation
  kg.addEdge({
    source: docSectionId,
    target: validationId,
    type: "has_link_validation",
    weight: 1.0,
    confidence: 1.0,
    properties: {
      validatedAt: new Date().toISOString(),
      hasBrokenLinks: validationSummary.brokenLinks > 0,
      needsAttention: validationSummary.brokenLinks > 0,
    },
  });

  // If there are broken links, create "requires_fix" edges
  if (validationSummary.brokenLinks > 0) {
    kg.addEdge({
      source: validationId,
      target: docSectionId,
      type: "requires_fix",
      weight: validationSummary.brokenLinks / validationSummary.totalLinks,
      confidence: 1.0,
      properties: {
        severity: validationSummary.brokenLinks > 5 ? "high" : "medium",
        brokenLinkCount: validationSummary.brokenLinks,
        detectedAt: new Date().toISOString(),
      },
    });
  }
}

/**
 * Get link validation history from Knowledge Graph
 */
export async function getLinkValidationHistory(
  docSectionId: string,
): Promise<GraphNode[]> {
  const kg = await getKnowledgeGraph();

  const edges = await kg.findEdges({
    source: docSectionId,
    type: "has_link_validation",
  });

  const validationNodes: GraphNode[] = [];
  const allNodes = await kg.getAllNodes();

  for (const edge of edges) {
    const validationNode = allNodes.find((n) => n.id === edge.target);
    if (validationNode) {
      validationNodes.push(validationNode);
    }
  }

  // Sort by lastValidated (newest first)
  return validationNodes.sort(
    (a, b) =>
      new Date(b.properties.lastValidated).getTime() -
      new Date(a.properties.lastValidated).getTime(),
  );
}

/**
 * Extract links from documentation content
 */
export function extractLinksFromContent(content: string): {
  externalLinks: string[];
  internalLinks: string[];
} {
  const externalLinks: string[] = [];
  const internalLinks: string[] = [];

  // Markdown links: [text](url)
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;

  while ((match = markdownLinkRegex.exec(content)) !== null) {
    const url = match[2];
    if (url.startsWith("http://") || url.startsWith("https://")) {
      externalLinks.push(url);
    } else {
      internalLinks.push(url);
    }
  }

  // HTML links: <a href="url">
  const htmlLinkRegex = /<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1/gi;

  while ((match = htmlLinkRegex.exec(content)) !== null) {
    const url = match[2];
    if (url.startsWith("http://") || url.startsWith("https://")) {
      externalLinks.push(url);
    } else {
      internalLinks.push(url);
    }
  }

  return {
    externalLinks: [...new Set(externalLinks)], // Remove duplicates
    internalLinks: [...new Set(internalLinks)],
  };
}

/**
 * Validate all links in a documentation section and store in KG
 */
export async function validateAndStoreDocumentationLinks(
  docSectionId: string,
  content: string,
): Promise<LinkValidationSummary> {
  const { externalLinks } = extractLinksFromContent(content);

  if (externalLinks.length === 0) {
    return {
      totalLinks: 0,
      validLinks: 0,
      brokenLinks: 0,
      warningLinks: 0,
      unknownLinks: 0,
      results: [],
    };
  }

  const validationSummary = await validateExternalLinks(externalLinks);
  await storeLinkValidationInKG(docSectionId, validationSummary);

  return validationSummary;
}
