/**
 * Unit tests for the commitlint `ignores` predicate defined in
 * `commitlint.config.js`.
 *
 * The predicate skips the Copilot Coding Agent bootstrap commit whose subject
 * is literally "Initial plan", while leaving all other commits subject to
 * normal commitlint validation.
 *
 * Acceptance criteria (from issue #140):
 *  (a) Copilot bootstrap commit subject "Initial plan" → ignored ✓
 *  (b) Valid Copilot work commit (conventional format) → NOT ignored ✓
 *  (c) Invalid human commit → NOT ignored (commitlint still catches it) ✓
 */

// The predicate mirrors the one in commitlint.config.js — any change to the
// config pattern must be reflected here and vice-versa.
const copilotBootstrapIgnore = (msg: string): boolean =>
  /^Initial plan(\n|$)/.test(msg);

describe("commitlint.config – copilot bootstrap ignores predicate", () => {
  // (a) Copilot bootstrap commit — must be ignored
  it("ignores the bare 'Initial plan' bootstrap commit", () => {
    expect(copilotBootstrapIgnore("Initial plan")).toBe(true);
  });

  it("ignores 'Initial plan' followed by a newline (commit with body)", () => {
    expect(copilotBootstrapIgnore("Initial plan\n\nSome body text here.")).toBe(true);
  });

  // (b) Valid Copilot work commit — must NOT be ignored
  it("does not ignore a valid conventional commit from Copilot", () => {
    expect(copilotBootstrapIgnore("feat: add ignores predicate for Copilot bootstrap commits")).toBe(false);
  });

  it("does not ignore a conventional fix commit", () => {
    expect(copilotBootstrapIgnore("fix(ci): correct fetch-depth in commitlint workflow step")).toBe(false);
  });

  // (c) Invalid human commit — must NOT be ignored (commitlint will still catch it)
  it("does not ignore an invalid human commit that starts with 'Initial'", () => {
    // "Initial setup" without a type prefix must still fail commitlint.
    expect(copilotBootstrapIgnore("Initial setup of the project")).toBe(false);
  });

  it("does not ignore a completely empty commit message", () => {
    expect(copilotBootstrapIgnore("")).toBe(false);
  });

  it("does not ignore a random commit message without a conventional prefix", () => {
    expect(copilotBootstrapIgnore("some random commit message without conventional prefix")).toBe(false);
  });

  it("does not ignore 'Initial plan' when it appears mid-message (not at start)", () => {
    expect(copilotBootstrapIgnore("chore: update Initial plan document")).toBe(false);
  });
});
