describe("Tools Integration", () => {
  it("should have analyze-repository tool implementation", () => {
    const fs = require("fs");
    const path = require("path");

    const toolPath = path.join(
      __dirname,
      "../../src/tools/analyze-repository.ts",
    );
    expect(fs.existsSync(toolPath)).toBe(true);

    const content = fs.readFileSync(toolPath, "utf8");
    expect(content).toContain("export");
    expect(content).toContain("analyzeRepository");
  });

  it("should have all MCP tools implemented", () => {
    const fs = require("fs");
    const path = require("path");

    const tools = [
      "analyze-repository.ts",
      "recommend-ssg.ts",
      "generate-config.ts",
      "setup-structure.ts",
      "deploy-pages.ts",
      "verify-deployment.ts",
    ];

    tools.forEach((tool) => {
      const toolPath = path.join(__dirname, "../../src/tools", tool);
      expect(fs.existsSync(toolPath)).toBe(true);

      const content = fs.readFileSync(toolPath, "utf8");
      expect(content).toContain("export");
    });
  });
});
