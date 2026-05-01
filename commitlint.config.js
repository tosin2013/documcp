export default {
  extends: ["@commitlint/config-conventional"],
  // Ignore the Copilot Coding Agent bootstrap commit whose subject is literally
  // "Initial plan" (no conventional-commit type prefix).  The pattern is narrow
  // enough that real human commits starting with "Initial" still fail because
  // our type-empty rule would catch them before this predicate fires.
  ignores: [(msg) => /^Initial plan(\n|$)/.test(msg)],
  rules: {
    "type-enum": [
      2,
      "always",
      [
        "feat", // New features
        "fix", // Bug fixes
        "docs", // Documentation changes
        "style", // Code style changes (formatting, etc.)
        "refactor", // Code refactoring
        "test", // Test additions/modifications
        "chore", // Maintenance tasks
        "perf", // Performance improvements
        "ci", // CI/CD changes
        "build", // Build system changes
        "revert", // Revert commits
      ],
    ],
    "subject-case": [2, "never", ["start-case", "pascal-case", "upper-case"]],
    "subject-empty": [2, "never"],
    "subject-full-stop": [2, "never", "."],
    "type-case": [2, "always", "lower-case"],
    "type-empty": [2, "never"],
    // Relax body line length to allow detailed commit messages (default is 100)
    "body-max-line-length": [1, "always", 200], // Warning instead of error, 200 char limit
    "footer-leading-blank": [1, "always"], // Warning instead of error for footer formatting
  },
};
