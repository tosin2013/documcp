# Release Health Dashboard

The Release Health Dashboard provides real-time visibility into DocuMCP's release quality, CI/CD performance, and package adoption.

## Overview

The dashboard is available at `/release-health` in the documentation site and displays:

- **Recent Releases**: Version history with publish times and CI status
- **CI/CD Performance**: Success rates, average duration, and flake detection
- **Test Coverage Trend**: Historical coverage data
- **NPM Package Stats**: Download statistics from the npm registry

## Architecture

### Data Collection

Metrics are collected by [`src/scripts/collect-release-health.ts`](../../src/scripts/collect-release-health.ts), which:

1. **Fetches GitHub data** via `gh` CLI:
   - Recent releases (version, publish time)
   - CI workflow runs (success rate, duration)

2. **Fetches npm data** via npm registry API:
   - Weekly and monthly download counts

3. **Generates JSON snapshot** saved to `docs/data/release-health.json`

### Automated Updates

The [`.github/workflows/release-health.yml`](../../.github/workflows/release-health.yml) workflow:

- Runs nightly at 2 AM UTC
- Executes the collection script
- Commits updated JSON to the repository
- Can be manually triggered via workflow_dispatch

### Dashboard Rendering

The dashboard page ([`docs/src/pages/release-health.md`](../src/pages/release-health.md)):

- Loads `release-health.json` on page load
- Renders metrics using vanilla JavaScript
- Styles with CSS custom properties for theme compatibility
- Falls back gracefully if data is unavailable

## Data Schema

### ReleaseHealthData

```typescript
interface ReleaseHealthData {
  generatedAt: string;           // ISO 8601 timestamp
  recentReleases: ReleaseMetrics[];
  ciMetrics: CIMetrics;
  coverageTrend: CoverageMetrics[];
  npmStats: {
    weeklyDownloads: number;
    monthlyDownloads: number;
    totalDownloads: number;
  };
}
```

### ReleaseMetrics

```typescript
interface ReleaseMetrics {
  version: string;               // e.g., "v0.8.0"
  publishedAt: string;           // ISO 8601 timestamp
  timeToPublishMinutes: number;  // Time from tag to npm publish
  ciSuccess: boolean;            // Whether CI passed
}
```

### CIMetrics

```typescript
interface CIMetrics {
  totalRuns: number;             // Last 50 runs
  successfulRuns: number;
  failedRuns: number;
  successRate: number;           // Percentage
  flakeRate: number;             // Percentage (retry-based)
  averageDurationMinutes: number;
}
```

### CoverageMetrics

```typescript
interface CoverageMetrics {
  timestamp: string;             // ISO 8601 timestamp
  coverage: number;              // Percentage
  trend: "up" | "down" | "stable";
}
```

## Running Locally

### Collect Metrics

```bash
# Install dependencies
npm install

# Run collection script
npx tsx src/scripts/collect-release-health.ts

# Output saved to docs/data/release-health.json
```

### View Dashboard

```bash
# Start Docusaurus dev server
cd docs
npm run start

# Navigate to http://localhost:3000/release-health
```

## Customization

### Adding New Metrics

1. **Update data collection** in `src/scripts/collect-release-health.ts`:
   ```typescript
   // Add new metric to ReleaseHealthData interface
   interface ReleaseHealthData {
     // ... existing fields
     newMetric: NewMetricType;
   }
   
   // Add collection function
   async function fetchNewMetric(): Promise<NewMetricType> {
     // Implementation
   }
   
   // Add to Promise.all in collectReleaseHealth()
   ```

2. **Update dashboard rendering** in `docs/src/pages/release-health.md`:
   ```javascript
   function renderNewMetric(data) {
     // Render logic
   }
   
   // Call in loadReleaseHealth()
   renderNewMetric(data.newMetric);
   ```

### Adjusting Collection Schedule

Edit `.github/workflows/release-health.yml`:

```yaml
on:
  schedule:
    # Change cron expression (currently 2 AM UTC daily)
    - cron: "0 2 * * *"
```

## Troubleshooting

### Data Not Updating

1. **Check workflow runs**:
   ```bash
   gh run list --workflow=release-health.yml
   ```

2. **View workflow logs**:
   ```bash
   gh run view <run-id> --log
   ```

3. **Manual trigger**:
   ```bash
   gh workflow run release-health.yml
   ```

### Dashboard Shows "Failed to Load"

1. **Verify JSON file exists**:
   ```bash
   ls -la docs/data/release-health.json
   ```

2. **Validate JSON**:
   ```bash
   cat docs/data/release-health.json | jq .
   ```

3. **Check browser console** for JavaScript errors

### Missing npm Stats

The npm registry API may rate-limit requests. If stats are missing:

1. Wait a few minutes and retry
2. Check npm registry status: https://status.npmjs.org/
3. Verify package name is correct in the script

## Future Enhancements

Potential improvements tracked in issues:

- Historical trend charts (line graphs)
- Deployment success tracking
- Security vulnerability counts
- Community contribution metrics
- Performance benchmark trends

## Related

- [ADR-013: Release Pipeline and Package Distribution](../adrs/adr-0013-release-pipeline-and-package-distribution.md)
- [Issue #116: Release health dashboard](https://github.com/tosin2013/documcp/issues/116)
- [GitHub Actions Documentation](https://docs.github.com/en/actions)
