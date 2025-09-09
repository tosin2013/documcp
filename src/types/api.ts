// Standardized API response types per DEVELOPMENT_RULES.md CODE-002
export interface MCPToolResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ErrorDetails;
  metadata: ResponseMetadata;
  recommendations?: Recommendation[];
  nextSteps?: NextStep[];
}

export interface ErrorDetails {
  code: string;
  message: string;
  details?: any;
  resolution?: string;
}

export interface ResponseMetadata {
  toolVersion: string;
  executionTime: number;
  timestamp: string;
  analysisId?: string;
}

export interface Recommendation {
  type: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  action?: string;
}

export interface NextStep {
  action: string;
  toolRequired: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high';
}

// Additional types for README health analysis and best practices
// These types prevent compilation errors when health analysis functionality is added
export interface HealthAnalysis {
  score: number;
  issues: HealthIssue[];
  recommendations: string[];
  metadata: {
    checkDate: string;
    version: string;
  };
}

export interface HealthIssue {
  type: 'critical' | 'warning' | 'info';
  message: string;
  section?: string;
  line?: number;
}

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  required: boolean;
  category: string;
}

export interface BestPracticesReport {
  items: ChecklistItem[];
  score: number;
  categories: {
    [category: string]: {
      total: number;
      completed: number;
      score: number;
    };
  };
  recommendations: string[];
}

// MCP content format wrapper for backward compatibility
export interface MCPContentWrapper {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  isError?: boolean;
}

// Helper to convert MCPToolResponse to MCP format
export function formatMCPResponse<T>(response: MCPToolResponse<T>): MCPContentWrapper | { content: Array<{ type: 'text'; text: string }>; isError: true } {
  const content: Array<{ type: 'text'; text: string }> = [];

  if (response.success) {
    // Main data response
    if (response.data) {
      content.push({
        type: 'text',
        text: JSON.stringify(response.data, null, 2),
      });
    } else {
      content.push({
        type: 'text',
        text: 'Operation completed successfully',
      });
    }

    // Metadata
    content.push({
      type: 'text',
      text: `\nExecution completed in ${response.metadata.executionTime}ms at ${response.metadata.timestamp}`,
    });

    // Recommendations
    if (response.recommendations?.length) {
      content.push({
        type: 'text',
        text: '\nRecommendations:\n' + response.recommendations
          .map(r => `${getRecommendationIcon(r.type)} ${r.title}: ${r.description}`)
          .join('\n'),
      });
    }

    // Next steps
    if (response.nextSteps?.length) {
      content.push({
        type: 'text',
        text: '\nNext Steps:\n' + response.nextSteps
          .map(s => `→ ${s.action} (use ${s.toolRequired}${s.description ? ': ' + s.description : ''})`)
          .join('\n'),
      });
    }
  } else if (response.error) {
    // For error cases, include both human-readable and structured data
    content.push({
      type: 'text',
      text: JSON.stringify(response, null, 2),
    });
    
    content.push({
      type: 'text',
      text: `Error: ${response.error.message}`,
    });
    
    if (response.error.resolution) {
      content.push({
        type: 'text',
        text: `Resolution: ${response.error.resolution}`,
      });
    }
    
    return { content, isError: true };
  }

  return { content };
}

function getRecommendationIcon(type: Recommendation['type']): string {
  switch (type) {
    case 'info':
      return 'ℹ️';
    case 'warning':
      return '⚠️';
    case 'critical':
      return '🔴';
    default:
      return '•';
  }
}

// Utility functions for type conversions to prevent common type errors
export function convertBestPracticesReportToChecklistItems(report: BestPracticesReport): ChecklistItem[] {
  return report.items;
}

export function generateHealthRecommendations(analysis: HealthAnalysis): string[] {
  return analysis.recommendations;
}