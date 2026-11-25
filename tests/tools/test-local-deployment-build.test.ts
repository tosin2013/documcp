// The install and build steps of test_local_deployment, with `exec` and `spawn` mocked: no test
// runs a real build tool or server (constitution VII).
import { testLocalDeployment } from "../../src/tools/test-local-deployment.js";
import * as childProcess from "child_process";
import { EventEmitter } from "events";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

jest.mock("child_process", () => {
  const actual = jest.requireActual("child_process");
  return { ...actual, spawn: jest.fn(), exec: jest.fn() };
});

const spawnMock = childProcess.spawn as unknown as jest.Mock;
const execMock = childProcess.exec as unknown as jest.Mock;

type ExecResult = { stdout?: string; stderr?: string } | Error;

// execResults maps a command prefix to what the mocked exec returns.
function mockExec(execResults: Record<string, ExecResult>) {
  execMock.mockImplementation(
    (
      cmd: string,
      _opts: unknown,
      cb: (e: Error | null, r?: unknown) => void,
    ) => {
      const key = Object.keys(execResults).find((k) => cmd.startsWith(k));
      const r = key ? execResults[key] : { stdout: "", stderr: "" };
      if (r instanceof Error) cb(r);
      else cb(null, { stdout: r.stdout ?? "", stderr: r.stderr ?? "" });
    },
  );
}

let repo: string;
let cwd: string;

beforeEach(() => {
  cwd = process.cwd();
  repo = fs.mkdtempSync(path.join(os.tmpdir(), "documcp-local-build-"));
  spawnMock.mockReset();
  execMock.mockReset();
  spawnMock.mockImplementation(() => {
    const child = new EventEmitter() as any;
    child.stdout = new EventEmitter();
    child.stderr = new EventEmitter();
    child.pid = 4243;
    child.killed = true;
    setImmediate(() => child.emit("exit", 0));
    return child;
  });
});

afterEach(() => {
  process.chdir(cwd); // the tool changes into the repository
  fs.rmSync(repo, { recursive: true, force: true });
});

async function run(ssg: string) {
  const result = await testLocalDeployment({ repositoryPath: repo, ssg });
  return JSON.parse(result.content[0].text);
}

describe("test_local_deployment: install and build", () => {
  it("reports a successful build with its output directory", async () => {
    fs.writeFileSync(path.join(repo, "hugo.toml"), "title = 'x'\n");
    fs.mkdirSync(path.join(repo, "public"));
    fs.writeFileSync(path.join(repo, "public", "index.html"), "<html></html>");
    mockExec({ hugo: { stdout: "Total in 12 ms" } });
    const data = await run("hugo");
    expect(data.buildSuccess).toBe(true);
    expect(data.buildOutput).toContain("Total in 12 ms");
    expect(data.recommendations.join("\n")).not.toContain("was not created");
  });

  it("flags a build with errors on stderr and a missing output directory", async () => {
    mockExec({ hugo: { stdout: "", stderr: "Error: template missing" } });
    const data = await run("hugo");
    expect(data.buildSuccess).toBe(true);
    expect(data.buildErrors).toContain("template missing");
    const recs = data.recommendations.join("\n");
    expect(recs).toContain("Build completed with errors");
    expect(recs).toContain("Build directory public was not created");
  });

  it("treats an empty output directory as not created", async () => {
    fs.mkdirSync(path.join(repo, "public"));
    mockExec({ hugo: { stdout: "" } });
    const data = await run("hugo");
    expect(data.recommendations.join("\n")).toContain(
      "Build directory public was not created",
    );
  });

  it("reports a failed build", async () => {
    mockExec({ hugo: new Error("hugo: command not found") });
    const data = await run("hugo");
    expect(data.buildSuccess).toBe(false);
    expect(data.buildErrors).toContain("command not found");
    expect(data.recommendations.join("\n")).toContain("Build failed");
  });

  it("reports dependency install warnings and failures", async () => {
    mockExec({
      "npm ci": { stderr: "deprecated package" },
      "npm install": { stderr: "deprecated package" },
      "bundle install": { stderr: "deprecated package" },
    });
    const warned = await run("docusaurus");
    expect(warned.recommendations.join("\n")).toContain(
      "Dependency installation warnings detected",
    );

    mockExec({
      "npm ci": new Error("ENETUNREACH"),
      "npm install": new Error("ENETUNREACH"),
      "bundle install": new Error("ENETUNREACH"),
    });
    const failed = await run("docusaurus");
    expect(failed.recommendations.join("\n")).toContain(
      "Dependency installation failed",
    );
  });
});
