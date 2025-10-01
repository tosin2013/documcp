import { promises as fs } from "fs";
import path from "path";

export interface ExtractedContent {
  readme?: {
    content: string;
    sections: Array<{
      title: string;
      content: string;
      level: number;
    }>;
  };
  existingDocs: Array<{
    path: string;
    title: string;
    content: string;
    category?: "tutorial" | "how-to" | "reference" | "explanation";
  }>;
  adrs: Array<{
    number: string;
    title: string;
    status: string;
    content: string;
    decision: string;
    consequences: string;
  }>;
  codeExamples: Array<{
    file: string;
    description: string;
    code: string;
    language: string;
  }>;
  apiDocs: Array<{
    endpoint?: string;
    function?: string;
    description: string;
    parameters: Array<{ name: string; type: string; description: string }>;
    returns?: string;
  }>;
}

export async function extractRepositoryContent(
  repoPath: string,
): Promise<ExtractedContent> {
  const content: ExtractedContent = {
    existingDocs: [],
    adrs: [],
    codeExamples: [],
    apiDocs: [],
  };

  // Extract README content
  content.readme = await extractReadme(repoPath);

  // Extract existing documentation
  content.existingDocs = await extractExistingDocs(repoPath);

  // Extract ADRs
  content.adrs = await extractADRs(repoPath);

  // Extract code examples from main source files
  content.codeExamples = await extractCodeExamples(repoPath);

  // Extract API documentation from code comments
  content.apiDocs = await extractAPIDocs(repoPath);

  return content;
}

async function extractReadme(
  repoPath: string,
): Promise<ExtractedContent["readme"] | undefined> {
  const readmeFiles = ["README.md", "readme.md", "Readme.md"];

  for (const filename of readmeFiles) {
    try {
      const readmePath = path.join(repoPath, filename);
      const content = await fs.readFile(readmePath, "utf-8");

      const sections = parseMarkdownSections(content);

      return { content, sections };
    } catch {
      // Continue to next potential README file
    }
  }

  return undefined;
}

async function extractExistingDocs(
  repoPath: string,
): Promise<ExtractedContent["existingDocs"]> {
  const docs: ExtractedContent["existingDocs"] = [];
  const docDirs = ["docs", "documentation", "doc"];

  for (const dir of docDirs) {
    try {
      const docsPath = path.join(repoPath, dir);
      await extractDocsFromDir(docsPath, docs, "");
    } catch {
      // Directory doesn't exist, continue
    }
  }

  return docs;
}

async function extractDocsFromDir(
  dirPath: string,
  docs: ExtractedContent["existingDocs"],
  relativePath: string,
): Promise<void> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.join(relativePath, entry.name);

    if (entry.isDirectory() && !entry.name.startsWith(".")) {
      await extractDocsFromDir(fullPath, docs, relPath);
    } else if (
      entry.isFile() &&
      (entry.name.endsWith(".md") || entry.name.endsWith(".mdx"))
    ) {
      try {
        const content = await fs.readFile(fullPath, "utf-8");
        const title = extractTitle(content, entry.name);
        const category = categorizeDocument(content, relPath);

        docs.push({
          path: relPath,
          title,
          content,
          category,
        });
      } catch {
        // Skip files that can't be read
      }
    }
  }
}

async function extractADRs(
  repoPath: string,
): Promise<ExtractedContent["adrs"]> {
  const adrs: ExtractedContent["adrs"] = [];
  const adrPaths = [
    "docs/adrs",
    "docs/adr",
    "docs/decisions",
    "docs/architecture/decisions",
    "adr",
  ];

  for (const adrDir of adrPaths) {
    try {
      const dirPath = path.join(repoPath, adrDir);
      const files = await fs.readdir(dirPath);

      for (const file of files) {
        if (file.endsWith(".md") && /\d{3,4}/.test(file)) {
          const content = await fs.readFile(path.join(dirPath, file), "utf-8");
          const adr = parseADR(content, file);
          if (adr) {
            adrs.push(adr);
          }
        }
      }

      // If we found ADRs, don't check other directories
      if (adrs.length > 0) break;
    } catch {
      // Directory doesn't exist, continue
    }
  }

  return adrs;
}

async function extractCodeExamples(
  repoPath: string,
): Promise<ExtractedContent["codeExamples"]> {
  const examples: ExtractedContent["codeExamples"] = [];

  // Look for example directories
  const exampleDirs = ["examples", "samples", "demo"];

  for (const dir of exampleDirs) {
    try {
      const examplesPath = path.join(repoPath, dir);
      await extractExamplesFromDir(examplesPath, examples);
    } catch {
      // Directory doesn't exist
    }
  }

  // Also extract from main source files if they contain example comments
  try {
    const srcPath = path.join(repoPath, "src");
    await extractInlineExamples(srcPath, examples);
  } catch {
    // No src directory
  }

  return examples;
}

async function extractExamplesFromDir(
  dirPath: string,
  examples: ExtractedContent["codeExamples"],
): Promise<void> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isFile()) {
      const ext = path.extname(entry.name);
      const language = getLanguageFromExtension(ext);

      if (language) {
        try {
          const code = await fs.readFile(fullPath, "utf-8");
          const description = extractExampleDescription(code);

          examples.push({
            file: entry.name,
            description: description || `Example: ${entry.name}`,
            code: code.slice(0, 500), // First 500 chars
            language,
          });
        } catch {
          // Skip unreadable files
        }
      }
    }
  }
}

async function extractInlineExamples(
  srcPath: string,
  examples: ExtractedContent["codeExamples"],
): Promise<void> {
  // Extract examples from comments marked with @example
  const files = await walkSourceFiles(srcPath);

  for (const file of files) {
    try {
      const content = await fs.readFile(file, "utf-8");
      const exampleBlocks = content.match(/@example[\s\S]*?(?=@\w|$)/g);

      if (exampleBlocks) {
        for (const block of exampleBlocks) {
          const code = block.replace(/@example\s*/, "").trim();
          const language = getLanguageFromExtension(path.extname(file));

          if (code && language) {
            examples.push({
              file: path.basename(file),
              description: `Example from ${path.basename(file)}`,
              code: code.slice(0, 500),
              language,
            });
          }
        }
      }
    } catch {
      // Skip unreadable files
    }
  }
}

async function extractAPIDocs(
  repoPath: string,
): Promise<ExtractedContent["apiDocs"]> {
  const apiDocs: ExtractedContent["apiDocs"] = [];

  // Look for API documentation in various formats
  const apiFiles = [
    "api.md",
    "API.md",
    "docs/api.md",
    "docs/API.md",
    "openapi.json",
    "openapi.yaml",
    "swagger.json",
    "swagger.yaml",
  ];

  for (const file of apiFiles) {
    try {
      const filePath = path.join(repoPath, file);
      const content = await fs.readFile(filePath, "utf-8");

      if (file.endsWith(".md")) {
        // Parse markdown API documentation
        const apis = parseMarkdownAPI(content);
        apiDocs.push(...apis);
      } else if (file.includes("openapi") || file.includes("swagger")) {
        // Parse OpenAPI/Swagger spec
        const apis = parseOpenAPISpec(content);
        apiDocs.push(...apis);
      }
    } catch {
      // File doesn't exist
    }
  }

  // Also extract from source code comments
  try {
    const srcPath = path.join(repoPath, "src");
    const jsDocAPIs = await extractJSDocAPIs(srcPath);
    apiDocs.push(...jsDocAPIs);
  } catch {
    // No src directory
  }

  return apiDocs;
}

// Helper functions

function parseMarkdownSections(
  content: string,
): Array<{ title: string; content: string; level: number }> {
  const sections: Array<{ title: string; content: string; level: number }> = [];
  const lines = content.split("\n");
  let currentSection: { title: string; content: string; level: number } | null =
    null;

  for (const line of lines) {
    const headerMatch = line.match(/^(#{1,6})\s+(.+)$/);

    if (headerMatch) {
      if (currentSection) {
        sections.push(currentSection);
      }
      currentSection = {
        title: headerMatch[2],
        content: "",
        level: headerMatch[1].length,
      };
    } else if (currentSection) {
      currentSection.content += line + "\n";
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

function extractTitle(content: string, filename: string): string {
  const lines = content.split("\n");

  for (const line of lines) {
    if (line.startsWith("# ")) {
      return line.replace("# ", "").trim();
    }
  }

  return filename.replace(/\.(md|mdx)$/, "").replace(/[-_]/g, " ");
}

function categorizeDocument(
  content: string,
  filePath: string,
): ExtractedContent["existingDocs"][0]["category"] {
  const lowerContent = content.toLowerCase();
  const lowerPath = filePath.toLowerCase();

  if (
    lowerPath.includes("tutorial") ||
    lowerPath.includes("getting-started") ||
    lowerContent.includes("## getting started") ||
    lowerContent.includes("# tutorial")
  ) {
    return "tutorial";
  }

  if (
    lowerPath.includes("how-to") ||
    lowerPath.includes("guide") ||
    lowerContent.includes("## how to") ||
    lowerContent.includes("# guide")
  ) {
    return "how-to";
  }

  if (
    lowerPath.includes("api") ||
    lowerPath.includes("reference") ||
    lowerContent.includes("## api") ||
    lowerContent.includes("# reference")
  ) {
    return "reference";
  }

  if (
    lowerPath.includes("concept") ||
    lowerPath.includes("explanation") ||
    lowerPath.includes("architecture") ||
    lowerPath.includes("adr")
  ) {
    return "explanation";
  }

  // Default categorization based on content patterns
  if (lowerContent.includes("step 1") || lowerContent.includes("first,")) {
    return "tutorial";
  }

  if (lowerContent.includes("to do this") || lowerContent.includes("you can")) {
    return "how-to";
  }

  return "reference";
}

function parseADR(
  content: string,
  filename: string,
): ExtractedContent["adrs"][0] | null {
  const lines = content.split("\n");
  const adr: Partial<ExtractedContent["adrs"][0]> = {
    content,
  };

  // Extract ADR number from filename
  const numberMatch = filename.match(/(\d{3,4})/);
  if (numberMatch) {
    adr.number = numberMatch[1];
  }

  // Extract title
  for (const line of lines) {
    if (line.startsWith("# ")) {
      adr.title = line
        .replace("# ", "")
        .replace(/^\d+\.?\s*/, "")
        .trim();
      break;
    }
  }

  // Extract status
  const statusMatch = content.match(/## Status\s*\n+([^\n]+)/i);
  if (statusMatch) {
    adr.status = statusMatch[1].trim();
  }

  // Extract decision
  const decisionMatch = content.match(/## Decision\s*\n+([\s\S]*?)(?=##|$)/i);
  if (decisionMatch) {
    adr.decision = decisionMatch[1].trim();
  }

  // Extract consequences
  const consequencesMatch = content.match(
    /## Consequences\s*\n+([\s\S]*?)(?=##|$)/i,
  );
  if (consequencesMatch) {
    adr.consequences = consequencesMatch[1].trim();
  }

  if (adr.number && adr.title) {
    return adr as ExtractedContent["adrs"][0];
  }

  return null;
}

function getLanguageFromExtension(ext: string): string | null {
  const languageMap: Record<string, string> = {
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "typescript",
    ".py": "python",
    ".rb": "ruby",
    ".go": "go",
    ".java": "java",
    ".cpp": "cpp",
    ".c": "c",
    ".rs": "rust",
    ".php": "php",
    ".swift": "swift",
    ".kt": "kotlin",
    ".scala": "scala",
    ".sh": "bash",
    ".yaml": "yaml",
    ".yml": "yaml",
    ".json": "json",
  };

  return languageMap[ext] || null;
}

function extractExampleDescription(code: string): string | null {
  const lines = code.split("\n").slice(0, 10);

  for (const line of lines) {
    if (
      line.includes("Example:") ||
      line.includes("Demo:") ||
      line.includes("Sample:")
    ) {
      return line.replace(/[/*#-]/, "").trim();
    }
  }

  return null;
}

async function walkSourceFiles(
  dir: string,
  files: string[] = [],
): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (
        entry.isDirectory() &&
        !entry.name.startsWith(".") &&
        entry.name !== "node_modules"
      ) {
        await walkSourceFiles(fullPath, files);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name);
        if (
          [".js", ".ts", ".jsx", ".tsx", ".py", ".rb", ".go", ".java"].includes(
            ext,
          )
        ) {
          files.push(fullPath);
        }
      }
    }
  } catch {
    // Directory doesn't exist or can't be read
  }

  return files;
}

function parseMarkdownAPI(content: string): ExtractedContent["apiDocs"] {
  const apis: ExtractedContent["apiDocs"] = [];
  const sections = content.split(/^##\s+/m);

  for (const section of sections) {
    if (
      section.includes("API") ||
      section.includes("endpoint") ||
      section.includes("function")
    ) {
      const lines = section.split("\n");
      const api: Partial<ExtractedContent["apiDocs"][0]> = {
        parameters: [],
      };

      // Extract function/endpoint name
      const titleMatch = lines[0].match(/`([^`]+)`/);
      if (titleMatch) {
        if (titleMatch[1].includes("/")) {
          api.endpoint = titleMatch[1];
        } else {
          api.function = titleMatch[1];
        }
      }

      // Extract description
      for (let i = 1; i < lines.length; i++) {
        if (lines[i] && !lines[i].startsWith("###")) {
          api.description = lines[i].trim();
          break;
        }
      }

      // Extract parameters
      const paramsIndex = lines.findIndex(
        (l) => l.includes("Parameters") || l.includes("Arguments"),
      );
      if (paramsIndex !== -1) {
        for (let i = paramsIndex + 1; i < lines.length; i++) {
          const paramMatch = lines[i].match(
            /[-*]\s*`([^`]+)`\s*\(([^)]+)\)\s*[-:]?\s*(.+)/,
          );
          if (paramMatch) {
            api.parameters?.push({
              name: paramMatch[1],
              type: paramMatch[2],
              description: paramMatch[3],
            });
          }
        }
      }

      // Extract returns
      const returnsIndex = lines.findIndex(
        (l) => l.includes("Returns") || l.includes("Response"),
      );
      if (returnsIndex !== -1 && returnsIndex + 1 < lines.length) {
        api.returns = lines[returnsIndex + 1].trim();
      }

      if ((api.endpoint || api.function) && api.description) {
        apis.push(api as ExtractedContent["apiDocs"][0]);
      }
    }
  }

  return apis;
}

function parseOpenAPISpec(content: string): ExtractedContent["apiDocs"] {
  const apis: ExtractedContent["apiDocs"] = [];

  try {
    const spec = JSON.parse(content);

    if (spec.paths) {
      for (const [path, methods] of Object.entries(spec.paths)) {
        for (const [method, operation] of Object.entries(methods as any)) {
          if (typeof operation === "object" && operation) {
            const api: ExtractedContent["apiDocs"][0] = {
              endpoint: `${method.toUpperCase()} ${path}`,
              description:
                (operation as any).summary ||
                (operation as any).description ||
                "",
              parameters: [],
            };

            if ((operation as any).parameters) {
              for (const param of (operation as any).parameters) {
                api.parameters.push({
                  name: param.name,
                  type: param.type || param.schema?.type || "any",
                  description: param.description || "",
                });
              }
            }

            if ((operation as any).responses?.["200"]) {
              api.returns = (operation as any).responses["200"].description;
            }

            apis.push(api);
          }
        }
      }
    }
  } catch {
    // Not valid JSON or doesn't follow expected structure
  }

  return apis;
}

async function extractJSDocAPIs(
  srcPath: string,
): Promise<ExtractedContent["apiDocs"]> {
  const apis: ExtractedContent["apiDocs"] = [];
  const files = await walkSourceFiles(srcPath);

  for (const file of files.slice(0, 20)) {
    // Limit to first 20 files for performance
    try {
      const content = await fs.readFile(file, "utf-8");
      const jsdocBlocks = content.match(/\/\*\*[\s\S]*?\*\//g);

      if (jsdocBlocks) {
        for (const block of jsdocBlocks) {
          const api = parseJSDocBlock(block);
          if (api) {
            apis.push(api);
          }
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  return apis;
}

function parseJSDocBlock(block: string): ExtractedContent["apiDocs"][0] | null {
  const api: Partial<ExtractedContent["apiDocs"][0]> = {
    parameters: [],
  };

  // Extract description (first line after /^**)
  const descMatch = block.match(/\/\*\*\s*\n\s*\*\s*([^@\n]+)/);
  if (descMatch) {
    api.description = descMatch[1].trim();
  }

  // Extract function name from the code following the JSDoc
  const functionMatch = block.match(
    /function\s+(\w+)|const\s+(\w+)\s*=|(\w+)\s*\(/,
  );
  if (functionMatch) {
    api.function = functionMatch[1] || functionMatch[2] || functionMatch[3];
  }

  // Extract parameters
  const paramMatches = block.matchAll(
    /@param\s*{([^}]+)}\s*(\w+)\s*-?\s*(.+)/g,
  );
  for (const match of paramMatches) {
    api.parameters?.push({
      name: match[2],
      type: match[1],
      description: match[3].trim(),
    });
  }

  // Extract returns
  const returnsMatch = block.match(/@returns?\s*{([^}]+)}\s*(.+)/);
  if (returnsMatch) {
    api.returns = `${returnsMatch[1]}: ${returnsMatch[2]}`;
  }

  if (api.function && api.description) {
    return api as ExtractedContent["apiDocs"][0];
  }

  return null;
}
