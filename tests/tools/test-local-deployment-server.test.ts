// The local server start path of test_local_deployment, with `spawn` mocked: no test starts a
// real server (constitution VII). Covers each way the start resolves and the process-group
// cleanup.
import { testLocalDeployment } from "../../src/tools/test-local-deployment.js";
import * as childProcess from "child_process";
import { EventEmitter } from "events";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

jest.mock("child_process", () => {
  const actual = jest.requireActual("child_process");
  return { ...actual, spawn: jest.fn() };
});

const spawnMock = childProcess.spawn as unknown as jest.Mock;

type Behaviour = (child: any) => void;

function fakeChild(behaviour: Behaviour) {
  const child = new EventEmitter() as any;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.pid = 4242;
  child.killed = false;
  setImmediate(() => behaviour(child));
  return child;
}

async function run(ssg: string, behaviour: Behaviour, port?: number) {
  spawnMock.mockImplementation(() => fakeChild(behaviour));
  const result = await testLocalDeployment({
    repositoryPath: repo,
    ssg,
    skipBuild: true,
    ...(port ? { port } : {}),
  });
  return JSON.parse(result.content[0].text);
}

let repo: string;
let cwd: string;
let killSpy: jest.SpyInstance;

beforeEach(() => {
  cwd = process.cwd();
  repo = fs.mkdtempSync(path.join(os.tmpdir(), "documcp-local-server-"));
  killSpy = jest.spyOn(process, "kill").mockImplementation(() => true);
  spawnMock.mockReset();
});

afterEach(() => {
  process.chdir(cwd); // the tool changes into the repository
  fs.rmSync(repo, { recursive: true, force: true });
  killSpy.mockRestore();
  jest.useRealTimers();
});

describe("test_local_deployment: local server start", () => {
  it("reports a started server from stdout and stops its process group", async () => {
    const data = await run("hugo", (c) =>
      c.stdout.emit(
        "data",
        Buffer.from("Web Server is available at Serving on :3000"),
      ),
    );
    expect(data.serverStarted).toBe(true);
    expect(data.localUrl).toBe("http://localhost:3000");
    expect(killSpy).toHaveBeenCalledWith(-4242, "SIGTERM");
  });

  it("reports a started server from stderr", async () => {
    const data = await run(
      "mkdocs",
      (c) =>
        c.stderr.emit(
          "data",
          Buffer.from("INFO - Local: http://localhost:4000"),
        ),
      4000,
    );
    expect(data.serverStarted).toBe(true);
    expect(data.localUrl).toBe("http://localhost:4000");
  });

  it("ignores output that isn't a start signal, then resolves on exit", async () => {
    const data = await run("jekyll", (c) => {
      c.stdout.emit("data", Buffer.from("Generating..."));
      c.stderr.emit("data", Buffer.from("warning: something"));
      c.emit("exit", 1);
    });
    expect(data.serverStarted).toBe(false);
    expect(data.localUrl).toBeUndefined();
  });

  it("resolves not started when the process fails to spawn", async () => {
    const data = await run("eleventy", (c) =>
      c.emit("error", new Error("ENOENT")),
    );
    expect(data.serverStarted).toBe(false);
  });

  it("resolves not started when spawn throws", async () => {
    spawnMock.mockImplementation(() => {
      throw new Error("spawn failed");
    });
    const result = await testLocalDeployment({
      repositoryPath: repo,
      ssg: "docusaurus",
      skipBuild: true,
    });
    expect(JSON.parse(result.content[0].text).serverStarted).toBe(false);
  });

  it("still resolves when the process group is already gone", async () => {
    killSpy.mockImplementation(() => {
      throw new Error("ESRCH");
    });
    const data = await run("hugo", (c) =>
      c.stdout.emit("data", Buffer.from("Server running")),
    );
    expect(data.serverStarted).toBe(true);
  });

  it("doesn't signal a process that already exited", async () => {
    const data = await run("hugo", (c) => {
      c.killed = true;
      c.stdout.emit("data", Buffer.from("Server running"));
    });
    expect(data.serverStarted).toBe(true);
    expect(killSpy).not.toHaveBeenCalled();
  });

  it("gives up after its start timeout when the server says nothing", async () => {
    jest.useFakeTimers({ doNotFake: ["setImmediate", "nextTick"] });
    let spawned!: () => void;
    const started = new Promise<void>((r) => (spawned = r));
    spawnMock.mockImplementation(() => {
      spawned();
      return fakeChild(() => undefined);
    });
    const pending = testLocalDeployment({
      repositoryPath: repo,
      ssg: "hugo",
      skipBuild: true,
    });
    await started;
    jest.advanceTimersByTime(10_000);
    const data = JSON.parse((await pending).content[0].text);
    expect(data.serverStarted).toBe(false);
    expect(killSpy).toHaveBeenCalledWith(-4242, "SIGTERM");
  });

  it.each([
    ["jekyll", "bundle exec jekyll serve --port 3000"],
    ["hugo", "hugo server --port 3000"],
    ["mkdocs", "mkdocs serve --dev-addr localhost:3000"],
    ["eleventy", "npx @11ty/eleventy --serve --port 3000"],
    ["docusaurus", "npm run serve"],
  ])(
    "runs the %s serve command with the port (%s), detached",
    async (ssg, command) => {
      await run(ssg, (c) => c.emit("exit", 0));
      expect(spawnMock).toHaveBeenCalledWith(
        "sh",
        ["-c", command],
        expect.objectContaining({ detached: true }),
      );
    },
  );
});
