/**
 * Context-Aware Content Generator (Phase 3)
 *
 * Generates documentation content based on actual code structure
 * Uses AST analysis and knowledge graph for accurate, contextual documentation
 */

import { Tool } from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import path from "path";
import {
  ASTAnalyzer,
  FunctionSignature,
  ClassInfo,
  InterfaceInfo,
} from "../utils/ast-analyzer.js";
import { formatMCPResponse, MCPToolResponse } from "../types/api.js";
import { handleMemoryRecall } from "../memory/index.js";

const inputSchema = z.object({
  filePath: z.string().describe("Path to the source code file"),
  documentationType: z
    .enum(["tutorial", "how-to", "reference", "explanation", "all"])
    .default("reference")
    .describe("Type of documentation to generate"),
  includeExamples: z
    .boolean()
    .default(true)
    .describe("Include code examples in generated documentation"),
  style: z
    .enum(["concise", "detailed", "verbose"])
    .default("detailed")
    .describe("Documentation style"),
  outputFormat: z
    .enum(["markdown", "mdx", "html"])
    .default("markdown")
    .describe("Output format for generated documentation"),
});

export interface GeneratedContent {
  filePath: string;
  documentationType: string;
  sections: GeneratedSection[];
  metadata: ContentMetadata;
}

export interface GeneratedSection {
  title: string;
  content: string;
  category: "tutorial" | "how-to" | "reference" | "explanation";
  codeReferences: string[];
  confidence: number;
}

export interface ContentMetadata {
  generatedAt: string;
  codeAnalysis: {
    functions: number;
    classes: number;
    interfaces: number;
    complexity: number;
  };
  similarExamples: number;
  confidence: number;
}

/**
 * Main content generation handler
 */
export async function handleGenerateContextualContent(
  args: unknown,
  context?: any,
): Promise<{ content: any[] }> {
  const startTime = Date.now();

  try {
    const { filePath, documentationType, includeExamples, style } =
      inputSchema.parse(args);

    await context?.info?.(
      `📝 Generating ${documentationType} documentation for ${path.basename(
        filePath,
      )}...`,
    );

    // Initialize AST analyzer
    const analyzer = new ASTAnalyzer();
    await analyzer.initialize();

    // Analyze the file
    await context?.info?.("🔍 Analyzing code structure...");
    const analysis = await analyzer.analyzeFile(filePath);

    if (!analysis) {
      throw new Error(`Failed to analyze file: ${filePath}`);
    }

    // Query knowledge graph for similar projects
    await context?.info?.("🧠 Retrieving contextual information...");
    const similarProjects = await findSimilarProjects(analysis, context);

    // Generate documentation sections
    const sections: GeneratedSection[] = [];

    if (documentationType === "reference" || documentationType === "all") {
      sections.push(
        ...generateReferenceDocumentation(analysis, similarProjects, style),
      );
    }

    if (documentationType === "tutorial" || documentationType === "all") {
      sections.push(
        ...generateTutorialDocumentation(
          analysis,
          similarProjects,
          includeExamples,
          style,
        ),
      );
    }

    if (documentationType === "how-to" || documentationType === "all") {
      sections.push(
        ...generateHowToDocumentation(
          analysis,
          similarProjects,
          includeExamples,
          style,
        ),
      );
    }

    if (documentationType === "explanation" || documentationType === "all") {
      sections.push(
        ...generateExplanationDocumentation(analysis, similarProjects, style),
      );
    }

    const metadata: ContentMetadata = {
      generatedAt: new Date().toISOString(),
      codeAnalysis: {
        functions: analysis.functions.length,
        classes: analysis.classes.length,
        interfaces: analysis.interfaces.length,
        complexity: analysis.complexity,
      },
      similarExamples: similarProjects.length,
      confidence: calculateOverallConfidence(sections),
    };

    const result: GeneratedContent = {
      filePath,
      documentationType,
      sections,
      metadata,
    };

    const response: MCPToolResponse<typeof result> = {
      success: true,
      data: result,
      metadata: {
        toolVersion: "3.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
      recommendations: [
        {
          type: "info",
          title: "Documentation Generated",
          description: `Generated ${sections.length} documentation section(s) with ${metadata.confidence}% confidence`,
        },
      ],
      nextSteps: [
        {
          action: "Review generated content",
          description: "Review and refine generated documentation for accuracy",
          priority: "high",
        },
        {
          action: "Add to documentation site",
          description:
            "Integrate generated content into your documentation structure",
          priority: "medium",
        },
        {
          action: "Validate content",
          toolRequired: "validate_diataxis_content",
          description:
            "Run validation to ensure generated content meets quality standards",
          priority: "medium",
        },
      ],
    };

    await context?.info?.(
      `✅ Generated ${sections.length} documentation section(s)`,
    );

    return formatMCPResponse(response, { fullResponse: true });
  } catch (error: any) {
    const errorResponse: MCPToolResponse = {
      success: false,
      error: {
        code: "GENERATION_FAILED",
        message: `Content generation failed: ${error.message}`,
        resolution: "Ensure the file path is valid and the file can be parsed",
      },
      metadata: {
        toolVersion: "3.0.0",
        executionTime: Date.now() - startTime,
        timestamp: new Date().toISOString(),
      },
    };

    return formatMCPResponse(errorResponse, { fullResponse: true });
  }
}

/**
 * Generate reference documentation
 */
function generateReferenceDocumentation(
  analysis: any,
  _similarProjects: any[],
  _style: string,
): GeneratedSection[] {
  const sections: GeneratedSection[] = [];

  // Generate function reference
  if (analysis.functions.length > 0) {
    sections.push(generateFunctionReference(analysis.functions, _style));
  }

  // Generate class reference
  if (analysis.classes.length > 0) {
    sections.push(generateClassReference(analysis.classes, _style));
  }

  // Generate interface reference
  if (analysis.interfaces.length > 0) {
    sections.push(generateInterfaceReference(analysis.interfaces, _style));
  }

  // Generate type reference
  if (analysis.types.length > 0) {
    sections.push(generateTypeReference(analysis.types, _style));
  }

  return sections;
}

/**
 * Generate function reference documentation
 */
function generateFunctionReference(
  functions: FunctionSignature[],
  _style: string,
): GeneratedSection {
  let content = "# Function Reference\n\n";

  for (const func of functions.filter((f) => f.isExported)) {
    content += `## \`${func.name}\`\n\n`;

    if (func.docComment) {
      content += `${cleanDocComment(func.docComment)}\n\n`;
    }

    // Signature
    const params = func.parameters
      .map((p) => `${p.name}: ${p.type || "any"}`)
      .join(", ");
    const returnType = func.returnType || "void";
    const asyncPrefix = func.isAsync ? "async " : "";

    content += "**Signature:**\n\n";
    content += "```typescript\n";
    content += `${asyncPrefix}function ${func.name}(${params}): ${returnType}\n`;
    content += "```\n\n";

    // Parameters
    if (func.parameters.length > 0) {
      content += "**Parameters:**\n\n";
      for (const param of func.parameters) {
        const optionalMarker = param.optional ? " (optional)" : "";
        const defaultValue = param.defaultValue
          ? ` = ${param.defaultValue}`
          : "";
        content += `- \`${param.name}\`${optionalMarker}: \`${
          param.type || "any"
        }\`${defaultValue}\n`;
      }
      content += "\n";
    }

    // Return value
    if (func.returnType && func.returnType !== "void") {
      content += "**Returns:**\n\n";
      content += `- \`${func.returnType}\`\n\n`;
    }

    if (_style === "detailed" || _style === "verbose") {
      content += `**Complexity:** ${func.complexity}\n\n`;
    }

    content += "---\n\n";
  }

  return {
    title: "Function Reference",
    content,
    category: "reference",
    codeReferences: functions.map((f) => f.name),
    confidence: 0.9,
  };
}

/**
 * Generate class reference documentation
 */
function generateClassReference(
  classes: ClassInfo[],
  _style: string,
): GeneratedSection {
  let content = "# Class Reference\n\n";

  for (const cls of classes.filter((c) => c.isExported)) {
    content += `## \`${cls.name}\`\n\n`;

    if (cls.docComment) {
      content += `${cleanDocComment(cls.docComment)}\n\n`;
    }

    // Inheritance
    if (cls.extends) {
      content += `**Extends:** \`${cls.extends}\`\n\n`;
    }

    if (cls.implements.length > 0) {
      content += `**Implements:** ${cls.implements
        .map((i) => `\`${i}\``)
        .join(", ")}\n\n`;
    }

    // Properties
    if (cls.properties.length > 0) {
      content += "### Properties\n\n";
      for (const prop of cls.properties) {
        const visibility =
          prop.visibility !== "public" ? `${prop.visibility} ` : "";
        const readonly = prop.isReadonly ? "readonly " : "";
        const static_ = prop.isStatic ? "static " : "";
        content += `- ${visibility}${static_}${readonly}\`${prop.name}\`: \`${
          prop.type || "any"
        }\`\n`;
      }
      content += "\n";
    }

    // Methods
    if (cls.methods.length > 0) {
      content += "### Methods\n\n";
      for (const method of cls.methods.filter((m) => m.isPublic)) {
        const params = method.parameters
          .map((p) => `${p.name}: ${p.type || "any"}`)
          .join(", ");
        const returnType = method.returnType || "void";
        const asyncPrefix = method.isAsync ? "async " : "";

        content += `#### \`${method.name}\`\n\n`;

        if (method.docComment) {
          content += `${cleanDocComment(method.docComment)}\n\n`;
        }

        content += "```typescript\n";
        content += `${asyncPrefix}${method.name}(${params}): ${returnType}\n`;
        content += "```\n\n";
      }
    }

    content += "---\n\n";
  }

  return {
    title: "Class Reference",
    content,
    category: "reference",
    codeReferences: classes.map((c) => c.name),
    confidence: 0.9,
  };
}

/**
 * Generate interface reference documentation
 */
function generateInterfaceReference(
  interfaces: InterfaceInfo[],
  _style: string,
): GeneratedSection {
  let content = "# Interface Reference\n\n";

  for (const iface of interfaces.filter((i) => i.isExported)) {
    content += `## \`${iface.name}\`\n\n`;

    if (iface.docComment) {
      content += `${cleanDocComment(iface.docComment)}\n\n`;
    }

    if (iface.extends.length > 0) {
      content += `**Extends:** ${iface.extends
        .map((e) => `\`${e}\``)
        .join(", ")}\n\n`;
    }

    // Properties
    if (iface.properties.length > 0) {
      content += "### Properties\n\n";
      content += "```typescript\n";
      content += `interface ${iface.name} {\n`;
      for (const prop of iface.properties) {
        const readonly = prop.isReadonly ? "readonly " : "";
        content += `  ${readonly}${prop.name}: ${prop.type || "any"};\n`;
      }
      content += "}\n";
      content += "```\n\n";
    }

    // Methods
    if (iface.methods.length > 0) {
      content += "### Methods\n\n";
      for (const method of iface.methods) {
        const params = method.parameters
          .map((p) => `${p.name}: ${p.type || "any"}`)
          .join(", ");
        const returnType = method.returnType || "void";
        content += `- \`${method.name}(${params}): ${returnType}\`\n`;
      }
      content += "\n";
    }

    content += "---\n\n";
  }

  return {
    title: "Interface Reference",
    content,
    category: "reference",
    codeReferences: interfaces.map((i) => i.name),
    confidence: 0.9,
  };
}

/**
 * Generate type reference documentation
 */
function generateTypeReference(types: any[], _style: string): GeneratedSection {
  let content = "# Type Reference\n\n";

  for (const type of types.filter((t: any) => t.isExported)) {
    content += `## \`${type.name}\`\n\n`;

    if (type.docComment) {
      content += `${cleanDocComment(type.docComment)}\n\n`;
    }

    content += "```typescript\n";
    content += `type ${type.name} = ${type.definition};\n`;
    content += "```\n\n";

    content += "---\n\n";
  }

  return {
    title: "Type Reference",
    content,
    category: "reference",
    codeReferences: types.map((t: any) => t.name),
    confidence: 0.85,
  };
}

/**
 * Generate tutorial documentation
 */
function generateTutorialDocumentation(
  analysis: any,
  _similarProjects: any[],
  includeExamples: boolean,
  _style: string,
): GeneratedSection[] {
  const sections: GeneratedSection[] = [];

  // Generate getting started tutorial
  const tutorialContent = generateGettingStartedTutorial(
    analysis,
    includeExamples,
  );
  sections.push(tutorialContent);

  return sections;
}

/**
 * Generate getting started tutorial
 */
function generateGettingStartedTutorial(
  analysis: any,
  includeExamples: boolean,
): GeneratedSection {
  let content = "# Getting Started\n\n";

  content += "This tutorial will guide you through using this module.\n\n";

  content += "## Installation\n\n";
  content += "```bash\n";
  content += "npm install your-package\n";
  content += "```\n\n";

  content += "## Basic Usage\n\n";

  if (includeExamples && analysis.functions.length > 0) {
    const mainFunction =
      analysis.functions.find((f: any) => f.name === "main") ||
      analysis.functions[0];

    content += `Import and use the main functions:\n\n`;
    content += "```typescript\n";
    content += `import { ${mainFunction.name} } from 'your-package';\n\n`;

    const exampleParams = mainFunction.parameters
      .map((p: any) => {
        if (p.type === "string") return `"example"`;
        if (p.type === "number") return "42";
        if (p.type === "boolean") return "true";
        return "{}";
      })
      .join(", ");

    content += `// Example usage\n`;
    content += `const result = ${mainFunction.isAsync ? "await " : ""}${
      mainFunction.name
    }(${exampleParams});\n`;
    content += "console.log(result);\n";
    content += "```\n\n";
  }

  content += "## Next Steps\n\n";
  content +=
    "- Explore the [API Reference](#reference) for detailed documentation\n";
  content += "- Check out [How-To Guides](#how-to) for specific use cases\n";
  content +=
    "- Read the [Explanation](#explanation) for deeper understanding\n\n";

  return {
    title: "Getting Started Tutorial",
    content,
    category: "tutorial",
    codeReferences: analysis.functions.map((f: any) => f.name),
    confidence: 0.75,
  };
}

/**
 * Generate how-to documentation
 */
function generateHowToDocumentation(
  analysis: any,
  _similarProjects: any[],
  includeExamples: boolean,
  _style: string,
): GeneratedSection[] {
  const sections: GeneratedSection[] = [];

  // Generate how-to guides based on common patterns
  if (analysis.functions.some((f: any) => f.isAsync)) {
    sections.push(generateAsyncHowTo(analysis, includeExamples));
  }

  if (analysis.classes.length > 0) {
    sections.push(generateClassUsageHowTo(analysis, includeExamples));
  }

  return sections;
}

/**
 * Generate async usage how-to
 */
function generateAsyncHowTo(
  analysis: any,
  includeExamples: boolean,
): GeneratedSection {
  let content = "# How to Handle Async Operations\n\n";

  content += "This module uses async/await for asynchronous operations.\n\n";

  if (includeExamples) {
    const asyncFunc = analysis.functions.find((f: any) => f.isAsync);
    if (asyncFunc) {
      content += "## Example\n\n";
      content += "```typescript\n";
      content += `try {\n`;
      content += `  const result = await ${asyncFunc.name}();\n`;
      content += `  console.log('Success:', result);\n`;
      content += `} catch (error) {\n`;
      content += `  console.error('Error:', error);\n`;
      content += `}\n`;
      content += "```\n\n";
    }
  }

  return {
    title: "Async Operations Guide",
    content,
    category: "how-to",
    codeReferences: analysis.functions
      .filter((f: any) => f.isAsync)
      .map((f: any) => f.name),
    confidence: 0.8,
  };
}

/**
 * Generate class usage how-to
 */
function generateClassUsageHowTo(
  analysis: any,
  includeExamples: boolean,
): GeneratedSection {
  let content = "# How to Use Classes\n\n";

  const firstClass = analysis.classes[0];
  if (firstClass && includeExamples) {
    content += `## Creating an Instance\n\n`;
    content += "```typescript\n";
    content += `const instance = new ${firstClass.name}();\n`;
    content += "```\n\n";

    if (firstClass.methods.length > 0) {
      content += `## Using Methods\n\n`;
      content += "```typescript\n";
      const publicMethod = firstClass.methods.find((m: any) => m.isPublic);
      if (publicMethod) {
        content += `const result = ${
          publicMethod.isAsync ? "await " : ""
        }instance.${publicMethod.name}();\n`;
      }
      content += "```\n\n";
    }
  }

  return {
    title: "Class Usage Guide",
    content,
    category: "how-to",
    codeReferences: analysis.classes.map((c: any) => c.name),
    confidence: 0.8,
  };
}

/**
 * Generate explanation documentation
 */
function generateExplanationDocumentation(
  analysis: any,
  _similarProjects: any[],
  _style: string,
): GeneratedSection[] {
  const sections: GeneratedSection[] = [];

  // Generate architecture explanation
  sections.push(generateArchitectureExplanation(analysis));

  return sections;
}

/**
 * Generate architecture explanation
 */
function generateArchitectureExplanation(analysis: any): GeneratedSection {
  let content = "# Architecture\n\n";

  content += "## Overview\n\n";
  content += `This module consists of ${analysis.functions.length} function(s), ${analysis.classes.length} class(es), and ${analysis.interfaces.length} interface(s).\n\n`;

  if (analysis.classes.length > 0) {
    content += "## Class Structure\n\n";
    content +=
      "The module uses object-oriented patterns with the following classes:\n\n";
    for (const cls of analysis.classes.filter((c: any) => c.isExported)) {
      content += `- **${cls.name}**: ${cls.methods.length} method(s), ${cls.properties.length} property(ies)\n`;
    }
    content += "\n";
  }

  if (analysis.complexity > 20) {
    content += "## Complexity\n\n";
    content += `This module has a moderate to high complexity score (${analysis.complexity}), indicating sophisticated logic and multiple control flow paths.\n\n`;
  }

  return {
    title: "Architecture Explanation",
    content,
    category: "explanation",
    codeReferences: [
      ...analysis.functions.map((f: any) => f.name),
      ...analysis.classes.map((c: any) => c.name),
    ],
    confidence: 0.7,
  };
}

/**
 * Find similar projects in knowledge graph
 */
async function findSimilarProjects(
  analysis: any,
  context?: any,
): Promise<any[]> {
  try {
    const query = `${analysis.language} ${analysis.functions.length} functions ${analysis.classes.length} classes`;
    const results = await handleMemoryRecall({
      query,
      type: "analysis",
      limit: 5,
    });

    return results.memories || [];
  } catch (error) {
    await context?.warn?.(`Failed to retrieve similar projects: ${error}`);
    return [];
  }
}

/**
 * Calculate overall confidence
 */
function calculateOverallConfidence(sections: GeneratedSection[]): number {
  if (sections.length === 0) return 0;
  const avgConfidence =
    sections.reduce((sum, s) => sum + s.confidence, 0) / sections.length;
  return Math.round(avgConfidence * 100);
}

/**
 * Clean JSDoc comment
 */
function cleanDocComment(comment: string): string {
  return comment
    .replace(/\/\*\*|\*\//g, "")
    .replace(/^\s*\* ?/gm, "")
    .trim();
}

/**
 * Tool definition
 */
export const generateContextualContent: Tool = {
  name: "generate_contextual_content",
  description:
    "Generate context-aware documentation using AST analysis and knowledge graph insights (Phase 3)",
  inputSchema: {
    type: "object",
    properties: {
      filePath: {
        type: "string",
        description: "Path to the source code file to document",
      },
      documentationType: {
        type: "string",
        enum: ["tutorial", "how-to", "reference", "explanation", "all"],
        default: "reference",
        description: "Type of Diataxis documentation to generate",
      },
      includeExamples: {
        type: "boolean",
        default: true,
        description: "Include code examples in generated documentation",
      },
      style: {
        type: "string",
        enum: ["concise", "detailed", "verbose"],
        default: "detailed",
        description: "Documentation detail level",
      },
      outputFormat: {
        type: "string",
        enum: ["markdown", "mdx", "html"],
        default: "markdown",
        description: "Output format for generated content",
      },
    },
    required: ["filePath"],
  },
};
