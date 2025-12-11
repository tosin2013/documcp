import {
  handleChangeWatcher,
  __resetChangeWatcher,
} from "../src/tools/change-watcher.js";
import { formatMCPResponse } from "../src/types/api.js";

// Mock ChangeWatcher implementation to avoid real FS/network usage
const startMock = jest.fn();
const stopMock = jest.fn();
const triggerMock = jest.fn().mockResolvedValue({ ok: true });
const installHookMock = jest.fn().mockResolvedValue("/tmp/hook");

jest.mock("../src/utils/change-watcher.js", () => {
  return {
    ChangeWatcher: jest.fn().mockImplementation(() => ({
      start: startMock,
      stop: stopMock,
      getStatus: () => ({ running: true }),
      triggerManual: triggerMock,
      installGitHook: installHookMock,
    })),
  };
});

const baseArgs = {
  projectPath: "/repo",
  docsPath: "/repo/docs",
};

describe("change_watcher tool handler", () => {
  afterEach(() => {
    jest.clearAllMocks();
    __resetChangeWatcher();
  });

  it("returns status when not started", async () => {
    const res = await handleChangeWatcher({ ...baseArgs, action: "status" });
    const parsed = JSON.parse(res.content[0].text);

    expect(parsed.success).toBe(true);
    expect(parsed.data).toEqual({ running: false });
    expect(startMock).not.toHaveBeenCalled();
  });

  it("starts watcher and reports running status", async () => {
    const res = await handleChangeWatcher({ ...baseArgs, action: "start" });
    const parsed = JSON.parse(res.content[0].text);

    expect(parsed.success).toBe(true);
    expect(startMock).toHaveBeenCalledTimes(1);
    expect(parsed.data).toEqual({ running: true });
  });

  it("triggers manual detection", async () => {
    await handleChangeWatcher({ ...baseArgs, action: "start" });
    const res = await handleChangeWatcher({
      ...baseArgs,
      action: "trigger",
      reason: "test",
    });
    const parsed = JSON.parse(res.content[0].text);

    expect(triggerMock).toHaveBeenCalledWith("test", undefined);
    expect(parsed.data).toEqual({ ok: true });
  });

  it("installs git hook", async () => {
    await handleChangeWatcher({ ...baseArgs, action: "start" });
    const res = await handleChangeWatcher({
      ...baseArgs,
      action: "install_hook",
    });
    const parsed = JSON.parse(res.content[0].text);

    expect(installHookMock).toHaveBeenCalledWith("post-commit");
    expect(parsed.data).toEqual({ hook: "/tmp/hook" });
  });

  it("stops watcher", async () => {
    await handleChangeWatcher({ ...baseArgs, action: "start" });
    const res = await handleChangeWatcher({ ...baseArgs, action: "stop" });
    const parsed = JSON.parse(res.content[0].text);

    expect(stopMock).toHaveBeenCalled();
    expect(parsed.data).toEqual({ running: false });
  });
});
