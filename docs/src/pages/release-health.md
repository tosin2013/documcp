# Release Health Dashboard

Real-time metrics for DocuMCP releases, CI/CD performance, and package health.

## 📊 Recent Releases

<div id="recent-releases"></div>

## 🔄 CI/CD Performance

<div id="ci-metrics"></div>

## 📈 Test Coverage Trend

<div id="coverage-trend"></div>

## 📦 NPM Package Stats

<div id="npm-stats"></div>

---

<script type="module">
// Load release health data
async function loadReleaseHealth() {
  try {
    const response = await fetch('/data/release-health.json');
    const data = await response.json();
    
    renderRecentReleases(data.recentReleases);
    renderCIMetrics(data.ciMetrics);
    renderCoverageTrend(data.coverageTrend);
    renderNpmStats(data.npmStats);
    
    // Update last updated time
    const lastUpdated = new Date(data.generatedAt).toLocaleString();
    document.getElementById('last-updated').textContent = lastUpdated;
  } catch (error) {
    console.error('Failed to load release health data:', error);
    document.querySelectorAll('[id^="recent-"], [id^="ci-"], [id^="coverage-"], [id^="npm-"]').forEach(el => {
      el.innerHTML = '<p>⚠️ Failed to load metrics. Data will be available after the first nightly run.</p>';
    });
  }
}

function renderRecentReleases(releases) {
  const container = document.getElementById('recent-releases');
  if (!releases || releases.length === 0) {
    container.innerHTML = '<p>No releases found.</p>';
    return;
  }
  
  const table = `
    <table>
      <thead>
        <tr>
          <th>Version</th>
          <th>Published</th>
          <th>Time to Publish</th>
          <th>CI Status</th>
        </tr>
      </thead>
      <tbody>
        ${releases.slice(0, 10).map(r => `
          <tr>
            <td><code>${r.version}</code></td>
            <td>${new Date(r.publishedAt).toLocaleDateString()}</td>
            <td>${r.timeToPublishMinutes} min</td>
            <td>${r.ciSuccess ? '✅' : '❌'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  `;
  
  container.innerHTML = table;
}

function renderCIMetrics(metrics) {
  const container = document.getElementById('ci-metrics');
  if (!metrics) {
    container.innerHTML = '<p>No CI metrics available.</p>';
    return;
  }
  
  const html = `
    <div class="metrics-grid">
      <div class="metric-card">
        <h3>Success Rate</h3>
        <div class="metric-value ${metrics.successRate >= 90 ? 'success' : metrics.successRate >= 75 ? 'warning' : 'error'}">
          ${metrics.successRate.toFixed(1)}%
        </div>
        <div class="metric-detail">${metrics.successfulRuns} / ${metrics.totalRuns} runs</div>
      </div>
      
      <div class="metric-card">
        <h3>Average Duration</h3>
        <div class="metric-value">${metrics.averageDurationMinutes} min</div>
        <div class="metric-detail">Last 50 runs</div>
      </div>
      
      <div class="metric-card">
        <h3>Failed Runs</h3>
        <div class="metric-value ${metrics.failedRuns === 0 ? 'success' : 'warning'}">
          ${metrics.failedRuns}
        </div>
        <div class="metric-detail">Last 50 runs</div>
      </div>
      
      <div class="metric-card">
        <h3>Flake Rate</h3>
        <div class="metric-value success">${metrics.flakeRate.toFixed(1)}%</div>
        <div class="metric-detail">Retry-based detection</div>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

function renderCoverageTrend(trend) {
  const container = document.getElementById('coverage-trend');
  if (!trend || trend.length === 0) {
    container.innerHTML = '<p>No coverage data available.</p>';
    return;
  }
  
  const latest = trend[0];
  const trendIcon = latest.trend === 'up' ? '📈' : latest.trend === 'down' ? '📉' : '➡️';
  
  const html = `
    <div class="metric-card">
      <h3>Current Coverage</h3>
      <div class="metric-value ${latest.coverage >= 85 ? 'success' : 'warning'}">
        ${latest.coverage}%
      </div>
      <div class="metric-detail">
        ${trendIcon} ${latest.trend.toUpperCase()}
        <br/>
        Last updated: ${new Date(latest.timestamp).toLocaleDateString()}
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

function renderNpmStats(stats) {
  const container = document.getElementById('npm-stats');
  if (!stats) {
    container.innerHTML = '<p>No npm stats available.</p>';
    return;
  }
  
  const html = `
    <div class="metrics-grid">
      <div class="metric-card">
        <h3>Weekly Downloads</h3>
        <div class="metric-value">${stats.weeklyDownloads.toLocaleString()}</div>
        <div class="metric-detail">Last 7 days</div>
      </div>
      
      <div class="metric-card">
        <h3>Monthly Downloads</h3>
        <div class="metric-value">${stats.monthlyDownloads.toLocaleString()}</div>
        <div class="metric-detail">Last 30 days</div>
      </div>
    </div>
  `;
  
  container.innerHTML = html;
}

// Load data on page load
loadReleaseHealth();
</script>

<style>
.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.metric-card {
  border: 1px solid var(--ifm-color-emphasis-300);
  border-radius: 8px;
  padding: 1.5rem;
  background: var(--ifm-background-surface-color);
}

.metric-card h3 {
  margin: 0 0 0.5rem 0;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--ifm-color-emphasis-700);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.metric-value {
  font-size: 2rem;
  font-weight: 700;
  margin: 0.5rem 0;
  color: var(--ifm-color-primary);
}

.metric-value.success {
  color: var(--ifm-color-success);
}

.metric-value.warning {
  color: var(--ifm-color-warning);
}

.metric-value.error {
  color: var(--ifm-color-danger);
}

.metric-detail {
  font-size: 0.875rem;
  color: var(--ifm-color-emphasis-600);
}

table {
  width: 100%;
  margin: 1rem 0;
  border-collapse: collapse;
}

table th {
  background: var(--ifm-color-emphasis-100);
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
}

table td {
  padding: 0.75rem;
  border-bottom: 1px solid var(--ifm-color-emphasis-200);
}

table tr:hover {
  background: var(--ifm-color-emphasis-50);
}
</style>

---

**Last Updated**: <span id="last-updated">Loading...</span>

**Data Source**: Collected nightly from GitHub API and npm registry. See [collection script](https://github.com/tosin2013/documcp/blob/main/src/scripts/collect-release-health.ts).
