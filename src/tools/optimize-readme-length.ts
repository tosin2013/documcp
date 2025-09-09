import { z } from 'zod';
import { promises as fs } from 'fs';
import path from 'path';
import { formatMCPResponse } from '../types/api.js';

// Input validation schema
const OptimizeReadmeLengthSchema = z.object({
  readme_path: z.string().min(1, 'README path is required'),
  target_audience: z.enum(['community', 'enterprise', 'internal', 'academic']).optional().default('community'),
  max_recommended_lines: z.number().min(50).max(1000).optional().default(250),
  output_directory: z.string().optional().describe('Directory to create segmented documentation files'),
  preserve_original: z.boolean().optional().default(true).describe('Keep original README as backup'),
});

// Input type that matches what users actually pass
export interface OptimizeReadmeLengthInput {
  readme_path: string;
  target_audience?: 'community' | 'enterprise' | 'internal' | 'academic';
  max_recommended_lines?: number;
  output_directory?: string;
  preserve_original?: boolean;
}

// Analysis interfaces
interface LengthAnalysis {
  currentLines: number;
  currentWords: number;
  currentCharacters: number;
  recommendedMaxLines: number;
  severity: 'optimal' | 'acceptable' | 'long' | 'excessive';
  reductionNeeded: number;
  estimatedReadTime: string;
  mobileReadability: 'excellent' | 'good' | 'poor' | 'very-poor';
}

interface ContentSegment {
  type: 'essential' | 'important' | 'detailed' | 'supplementary';
  title: string;
  content: string;
  startLine: number;
  endLine: number;
  suggestedLocation: string;
  priority: number;
  estimatedLines: number;
}

interface OptimizationSuggestion {
  action: 'keep' | 'condense' | 'move' | 'remove' | 'link';
  section: string;
  reason: string;
  impact: 'high' | 'medium' | 'low';
  newLocation?: string;
  condensedVersion?: string;
}

interface ReadmeOptimizationReport {
  analysis: LengthAnalysis;
  segments: ContentSegment[];
  suggestions: OptimizationSuggestion[];
  optimizedReadme: string;
  segmentedFiles: { [filename: string]: string };
  summary: {
    originalLines: number;
    optimizedLines: number;
    reductionPercentage: number;
    filesCreated: string[];
    estimatedImprovementTime: string;
  };
}

export async function optimizeReadmeLength(input: OptimizeReadmeLengthInput) {
  const startTime = Date.now();
  try {
    // Validate input
    const validatedInput = OptimizeReadmeLengthSchema.parse(input);
    
    // Read README file
    const readmePath = path.resolve(validatedInput.readme_path);
    const readmeContent = await fs.readFile(readmePath, 'utf-8');
    
    // Analyze current length and characteristics
    const analysis = analyzeReadmeLength(readmeContent, validatedInput.max_recommended_lines, validatedInput.target_audience);
    
    // Segment content by type and importance
    const segments = segmentReadmeContent(readmeContent);
    
    // Generate optimization suggestions
    const suggestions = generateOptimizationSuggestions(segments, analysis, validatedInput.target_audience);
    
    // Create optimized README and segmented files
    const { optimizedReadme, segmentedFiles } = createOptimizedContent(readmeContent, segments, suggestions);
    
    // Write files if output directory is specified
    let filesCreated: string[] = [];
    if (validatedInput.output_directory) {
      filesCreated = await writeOptimizedFiles(
        validatedInput.output_directory,
        optimizedReadme,
        segmentedFiles,
        validatedInput.preserve_original ? readmeContent : undefined
      );
    }
    
    const report: ReadmeOptimizationReport = {
      analysis,
      segments,
      suggestions,
      optimizedReadme,
      segmentedFiles,
      summary: {
        originalLines: analysis.currentLines,
        optimizedLines: optimizedReadme.split('\n').length,
        reductionPercentage: Math.round(((analysis.currentLines - optimizedReadme.split('\n').length) / analysis.currentLines) * 100),
        filesCreated,
        estimatedImprovementTime: estimateOptimizationTime(suggestions.length, Object.keys(segmentedFiles).length),
      },
    };

    const response = {
      readmePath: validatedInput.readme_path,
      targetAudience: validatedInput.target_audience,
      optimizationReport: report,
      recommendations: generateActionableRecommendations(report),
      nextSteps: generateNextSteps(report, validatedInput.output_directory !== undefined),
    };

    return formatMCPResponse({
      success: true,
      data: response,
      metadata: {
        toolVersion: '1.0.0',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    return formatMCPResponse({
      success: false,
      error: {
        code: 'README_OPTIMIZATION_FAILED',
        message: `Failed to optimize README length: ${error}`,
        resolution: 'Ensure README path is valid and file is readable',
      },
      metadata: {
        toolVersion: '1.0.0',
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    });
  }
}

function analyzeReadmeLength(content: string, maxLines: number, audience: string): LengthAnalysis {
  const lines = content.split('\n');
  const words = content.split(/\s+/).filter(word => word.length > 0);
  const characters = content.length;
  
  // Calculate severity based on length
  let severity: LengthAnalysis['severity'];
  if (lines.length <= maxLines * 0.8) severity = 'optimal';
  else if (lines.length <= maxLines) severity = 'acceptable';
  else if (lines.length <= maxLines * 1.5) severity = 'long';
  else severity = 'excessive';
  
  // Estimate read time (average 200 words per minute)
  const readTimeMinutes = Math.ceil(words.length / 200);
  const estimatedReadTime = readTimeMinutes < 1 ? '< 1 minute' : 
                           readTimeMinutes === 1 ? '1 minute' : 
                           `${readTimeMinutes} minutes`;
  
  // Mobile readability based on length and structure
  let mobileReadability: LengthAnalysis['mobileReadability'];
  if (lines.length <= 100) mobileReadability = 'excellent';
  else if (lines.length <= 200) mobileReadability = 'good';
  else if (lines.length <= 400) mobileReadability = 'poor';
  else mobileReadability = 'very-poor';
  
  return {
    currentLines: lines.length,
    currentWords: words.length,
    currentCharacters: characters,
    recommendedMaxLines: maxLines,
    severity,
    reductionNeeded: Math.max(0, lines.length - maxLines),
    estimatedReadTime,
    mobileReadability,
  };
}

function segmentReadmeContent(content: string): ContentSegment[] {
  const lines = content.split('\n');
  const segments: ContentSegment[] = [];
  
  let currentSection = '';
  let currentContent: string[] = [];
  let startLine = 0;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Detect section headers
    if (line.match(/^#{1,6}\s+/)) {
      // Save previous section if it exists
      if (currentSection && currentContent.length > 0) {
        segments.push(createContentSegment(currentSection, currentContent.join('\n'), startLine, i - 1));
      }
      
      // Start new section
      currentSection = line.replace(/^#{1,6}\s+/, '').trim();
      currentContent = [line];
      startLine = i;
    } else {
      currentContent.push(line);
    }
  }
  
  // Add final section
  if (currentSection && currentContent.length > 0) {
    segments.push(createContentSegment(currentSection, currentContent.join('\n'), startLine, lines.length - 1));
  }
  
  return segments;
}

function createContentSegment(title: string, content: string, startLine: number, endLine: number): ContentSegment {
  const lowerTitle = title.toLowerCase();
  
  // Classify segment type and priority
  let type: ContentSegment['type'];
  let priority: number;
  let suggestedLocation: string;
  
  if (lowerTitle.includes('install') || lowerTitle.includes('quick') || lowerTitle.includes('getting started')) {
    type = 'essential';
    priority = 1;
    suggestedLocation = 'README.md';
  } else if (lowerTitle.includes('usage') || lowerTitle.includes('example') || lowerTitle.includes('basic')) {
    type = 'essential';
    priority = 2;
    suggestedLocation = 'README.md';
  } else if (lowerTitle.includes('api') || lowerTitle.includes('reference') || lowerTitle.includes('configuration')) {
    type = 'detailed';
    priority = 4;
    suggestedLocation = 'docs/API.md';
  } else if (lowerTitle.includes('contribut') || lowerTitle.includes('develop') || lowerTitle.includes('build')) {
    type = 'supplementary';
    priority = 5;
    suggestedLocation = 'docs/CONTRIBUTING.md';
  } else if (lowerTitle.includes('advanced') || lowerTitle.includes('detail') || lowerTitle.includes('deep')) {
    type = 'detailed';
    priority = 4;
    suggestedLocation = 'docs/ADVANCED.md';
  } else if (lowerTitle.includes('faq') || lowerTitle.includes('troubleshoot') || lowerTitle.includes('problem')) {
    type = 'supplementary';
    priority = 6;
    suggestedLocation = 'docs/FAQ.md';
  } else if (lowerTitle.includes('license') || lowerTitle.includes('changelog') || lowerTitle.includes('history')) {
    type = 'supplementary';
    priority = 7;
    suggestedLocation = 'docs/';
  } else {
    type = 'important';
    priority = 3;
    suggestedLocation = 'README.md';
  }
  
  return {
    type,
    title,
    content,
    startLine,
    endLine,
    suggestedLocation,
    priority,
    estimatedLines: content.split('\n').length,
  };
}

function generateOptimizationSuggestions(segments: ContentSegment[], analysis: LengthAnalysis, audience: string): OptimizationSuggestion[] {
  const suggestions: OptimizationSuggestion[] = [];
  
  segments.forEach(segment => {
    const lowerTitle = segment.title.toLowerCase();
    
    if (segment.type === 'essential' || segment.priority <= 2) {
      // Keep essential content but maybe condense
      if (segment.estimatedLines > 20) {
        suggestions.push({
          action: 'condense',
          section: segment.title,
          reason: 'Essential section is too long, consider condensing key points',
          impact: 'medium',
          condensedVersion: generateCondensedVersion(segment.content),
        });
      } else {
        suggestions.push({
          action: 'keep',
          section: segment.title,
          reason: 'Essential content for quick understanding',
          impact: 'high',
        });
      }
    } else if (segment.type === 'detailed' || segment.priority >= 4) {
      // Move detailed content to separate files
      suggestions.push({
        action: 'move',
        section: segment.title,
        reason: 'Detailed content better suited for separate documentation',
        impact: 'high',
        newLocation: segment.suggestedLocation,
      });
    } else if (segment.estimatedLines > 30) {
      // Large sections should be moved or condensed
      suggestions.push({
        action: 'move',
        section: segment.title,
        reason: 'Section is too long for main README',
        impact: 'high',
        newLocation: segment.suggestedLocation,
      });
    } else if (segment.type === 'supplementary') {
      // Link to supplementary content
      suggestions.push({
        action: 'link',
        section: segment.title,
        reason: 'Supplementary information can be linked',
        impact: 'medium',
        newLocation: segment.suggestedLocation,
      });
    } else {
      suggestions.push({
        action: 'keep',
        section: segment.title,
        reason: 'Important content for README',
        impact: 'medium',
      });
    }
  });
  
  return suggestions;
}

function createOptimizedContent(originalContent: string, segments: ContentSegment[], suggestions: OptimizationSuggestion[]): { optimizedReadme: string; segmentedFiles: { [filename: string]: string } } {
  const segmentedFiles: { [filename: string]: string } = {};
  const readmeLines: string[] = [];
  
  // Add project header and essential info
  readmeLines.push('# Project Title\n');
  readmeLines.push('> Brief, compelling project description in one line\n');
  
  segments.forEach(segment => {
    const suggestion = suggestions.find(s => s.section === segment.title);
    
    if (!suggestion) return;
    
    switch (suggestion.action) {
      case 'keep':
        readmeLines.push(segment.content);
        break;
        
      case 'condense':
        if (suggestion.condensedVersion) {
          readmeLines.push(`## ${segment.title}\n`);
          readmeLines.push(suggestion.condensedVersion);
          readmeLines.push(`\n[📖 View detailed ${segment.title.toLowerCase()}](${suggestion.newLocation || 'docs/DETAILED.md'})\n`);
        } else {
          readmeLines.push(segment.content);
        }
        break;
        
      case 'move':
        // Add link in README
        readmeLines.push(`## ${segment.title}\n`);
        readmeLines.push(`[📖 View ${segment.title}](${suggestion.newLocation})\n`);
        
        // Add to segmented files
        const filename = suggestion.newLocation || 'docs/ADDITIONAL.md';
        if (!segmentedFiles[filename]) {
          segmentedFiles[filename] = '';
        }
        segmentedFiles[filename] += segment.content + '\n\n';
        break;
        
      case 'link':
        // Just add a link
        readmeLines.push(`- [${segment.title}](${suggestion.newLocation})`);
        
        // Add to segmented files
        const linkFilename = suggestion.newLocation || 'docs/ADDITIONAL.md';
        if (!segmentedFiles[linkFilename]) {
          segmentedFiles[linkFilename] = '';
        }
        segmentedFiles[linkFilename] += segment.content + '\n\n';
        break;
    }
  });
  
  // Add quick links section
  if (Object.keys(segmentedFiles).length > 0) {
    readmeLines.push('\n## 📚 Documentation\n');
    Object.keys(segmentedFiles).forEach(filename => {
      const displayName = path.basename(filename, '.md').replace(/[_-]/g, ' ');
      readmeLines.push(`- [${displayName}](${filename})`);
    });
    readmeLines.push('');
  }
  
  return {
    optimizedReadme: readmeLines.join('\n'),
    segmentedFiles,
  };
}

function generateCondensedVersion(content: string): string {
  const lines = content.split('\n');
  const condensed: string[] = [];
  
  // Keep headers and first few lines of each section
  let inCodeBlock = false;
  let headerCount = 0;
  
  for (const line of lines) {
    if (line.includes('```')) {
      inCodeBlock = !inCodeBlock;
    }
    
    if (line.match(/^#{1,6}\s+/) || inCodeBlock || line.trim() === '' || headerCount < 3) {
      condensed.push(line);
      if (line.match(/^#{1,6}\s+/)) {
        headerCount++;
      }
    } else if (condensed.length < 10) {
      condensed.push(line);
    }
  }
  
  if (condensed.length < lines.length) {
    condensed.push('\n[...see full documentation for more details]');
  }
  
  return condensed.join('\n');
}

async function writeOptimizedFiles(outputDir: string, optimizedReadme: string, segmentedFiles: { [filename: string]: string }, originalReadme?: string): Promise<string[]> {
  const filesCreated: string[] = [];
  
  // Create output directory
  await fs.mkdir(outputDir, { recursive: true });
  
  // Write optimized README
  const readmePath = path.join(outputDir, 'README.md');
  await fs.writeFile(readmePath, optimizedReadme);
  filesCreated.push('README.md');
  
  // Write original as backup if requested
  if (originalReadme) {
    const backupPath = path.join(outputDir, 'README.original.md');
    await fs.writeFile(backupPath, originalReadme);
    filesCreated.push('README.original.md');
  }
  
  // Write segmented files
  for (const [filename, content] of Object.entries(segmentedFiles)) {
    const filePath = path.join(outputDir, filename);
    const fileDir = path.dirname(filePath);
    
    // Create subdirectories if needed
    await fs.mkdir(fileDir, { recursive: true });
    
    await fs.writeFile(filePath, content);
    filesCreated.push(filename);
  }
  
  return filesCreated;
}

function generateActionableRecommendations(report: ReadmeOptimizationReport): string[] {
  const recommendations: string[] = [];
  
  if (report.analysis.severity === 'excessive') {
    recommendations.push('🚨 Critical: README is excessively long. Immediate optimization needed for user adoption.');
  } else if (report.analysis.severity === 'long') {
    recommendations.push('⚠️ Warning: README is longer than recommended. Consider optimization for better user experience.');
  }
  
  if (report.analysis.mobileReadability === 'very-poor' || report.analysis.mobileReadability === 'poor') {
    recommendations.push('📱 Mobile: Improve mobile readability by reducing length and adding clear sections.');
  }
  
  const moveActions = report.suggestions.filter(s => s.action === 'move');
  if (moveActions.length > 0) {
    recommendations.push(`📁 Structure: Move ${moveActions.length} sections to separate documentation files.`);
  }
  
  const condenseActions = report.suggestions.filter(s => s.action === 'condense');
  if (condenseActions.length > 0) {
    recommendations.push(`✂️ Condense: Shorten ${condenseActions.length} sections while keeping essential information.`);
  }
  
  if (report.summary.reductionPercentage > 30) {
    recommendations.push(`🎯 Target: Achieve ${report.summary.reductionPercentage}% reduction for optimal length.`);
  }
  
  return recommendations;
}

function generateNextSteps(report: ReadmeOptimizationReport, filesWritten: boolean): string[] {
  const steps: string[] = [];
  
  if (!filesWritten) {
    steps.push('Run tool with output_directory parameter to generate optimized files');
  } else {
    steps.push('Review generated optimized README and documentation files');
    steps.push('Test the new structure with potential users or contributors');
  }
  
  if (report.segmentedFiles && Object.keys(report.segmentedFiles).length > 0) {
    steps.push('Update navigation and links in your documentation');
    steps.push('Consider adding a documentation index or table of contents');
  }
  
  steps.push('Monitor user engagement and feedback after optimization');
  steps.push('Re-run analysis periodically to maintain optimal length');
  
  return steps;
}

function estimateOptimizationTime(suggestionCount: number, fileCount: number): string {
  const baseTime = suggestionCount * 10; // 10 minutes per suggestion
  const fileTime = fileCount * 15; // 15 minutes per file to create/organize
  const totalMinutes = baseTime + fileTime + 30; // 30 minutes for review and testing
  
  if (totalMinutes < 60) return `${totalMinutes} minutes`;
  if (totalMinutes < 480) return `${Math.round(totalMinutes / 60)} hours`;
  return `${Math.round(totalMinutes / 480)} days`;
}
