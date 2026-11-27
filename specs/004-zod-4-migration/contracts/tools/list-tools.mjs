// Start the built server over stdio and print tools/list as sorted JSON.
import { spawn } from "child_process";
const dir = process.argv[2];
const p = spawn("node", [dir + "/dist/index.js"], { cwd: process.argv[3] || "/tmp", stdio: ["pipe", "pipe", "ignore"], env: { ...process.env, DOCUMCP_STORAGE_DIR: process.argv[3] || "/tmp" } });
let buf = "";
const send = (m) => p.stdin.write(JSON.stringify(m) + "\n");
p.stdout.on("data", (d) => {
  buf += d;
  let i;
  while ((i = buf.indexOf("\n")) >= 0) {
    const line = buf.slice(0, i); buf = buf.slice(i + 1);
    const m = JSON.parse(line);
    if (m.id === 1) { send({ jsonrpc: "2.0", method: "notifications/initialized" }); send({ jsonrpc: "2.0", id: 2, method: "tools/list" }); }
    if (m.id === 2) {
      const sort = (v) => Array.isArray(v) ? v.map(sort) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort(v[k])])) : v;
      console.log(JSON.stringify(sort(m.result.tools), null, 1)); p.kill(); process.exit(0);
    }
  }
});
send({ jsonrpc: "2.0", id: 1, method: "initialize", params: { protocolVersion: "2025-06-18", capabilities: {}, clientInfo: { name: "probe", version: "0" } } });
setTimeout(() => { console.error("timeout"); p.kill(); process.exit(1); }, 30000);
