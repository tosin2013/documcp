import React, { useEffect, useState } from 'react';
import Layout from '@theme/Layout';
import styles from './release-health.module.css';

interface ReleaseMetrics {
  version: string;
  publishedAt: string;
  timeToPublishMinutes: number;
  ciSuccess: boolean;
}

interface CIMetrics {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  successRate: number;
  flakeRate: number;
  averageDurationMinutes: number;
}

interface CoverageMetrics {
  timestamp: string;
  coverage: number;
  trend: 'up' | 'down' | 'stable';
}

interface ReleaseHealthData {
  generatedAt: string;
  recentReleases: ReleaseMetrics[];
  ciMetrics: CIMetrics;
  coverageTrend: CoverageMetrics[];
  npmStats: {
    weeklyDownloads: number;
    monthlyDownloads: number;
    totalDownloads: number;
  };
}

export default function ReleaseHealth(): JSX.Element {
  const [data, setData] = useState<ReleaseHealthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/documcp/data/release-health.json')
      .then((res) => res.json())
      .then((json) => setData(json))
      .catch((err) => {
        console.error('Failed to load release health data:', err);
        setError('Failed to load metrics. Data will be available after the first nightly run.');
      });
  }, []);

  if (error) {
    return (
      <Layout title="Release Health Dashboard" description="DocuMCP release health metrics">
        <div className="container margin-vert--lg">
          <h1>Release Health Dashboard</h1>
          <div className="alert alert--warning">{error}</div>
        </div>
      </Layout>
    );
  }

  if (!data) {
    return (
      <Layout title="Release Health Dashboard" description="DocuMCP release health metrics">
        <div className="container margin-vert--lg">
          <h1>Release Health Dashboard</h1>
          <p>Loading metrics...</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Release Health Dashboard" description="DocuMCP release health metrics">
      <div className="container margin-vert--lg">
        <h1>📊 Release Health Dashboard</h1>
        <p className="hero__subtitle">
          Real-time metrics for DocuMCP releases, CI/CD performance, and package health.
        </p>

        <section className="margin-vert--lg">
          <h2>📦 Recent Releases</h2>
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Version</th>
                  <th>Published</th>
                  <th>Time to Publish</th>
                  <th>CI Status</th>
                </tr>
              </thead>
              <tbody>
                {data.recentReleases.slice(0, 10).map((release) => (
                  <tr key={release.version}>
                    <td><code>{release.version}</code></td>
                    <td>{new Date(release.publishedAt).toLocaleDateString()}</td>
                    <td>{release.timeToPublishMinutes} min</td>
                    <td>{release.ciSuccess ? '✅' : '❌'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="margin-vert--lg">
          <h2>🔄 CI/CD Performance</h2>
          <div className="row">
            <div className="col col--3">
              <div className="card">
                <div className="card__header">
                  <h3>Success Rate</h3>
                </div>
                <div className="card__body">
                  <div className={`metric-value ${data.ciMetrics.successRate >= 90 ? 'success' : data.ciMetrics.successRate >= 75 ? 'warning' : 'error'}`}>
                    {data.ciMetrics.successRate.toFixed(1)}%
                  </div>
                  <div className="metric-detail">
                    {data.ciMetrics.successfulRuns} / {data.ciMetrics.totalRuns} runs
                  </div>
                </div>
              </div>
            </div>

            <div className="col col--3">
              <div className="card">
                <div className="card__header">
                  <h3>Average Duration</h3>
                </div>
                <div className="card__body">
                  <div className="metric-value">{data.ciMetrics.averageDurationMinutes} min</div>
                  <div className="metric-detail">Last 50 runs</div>
                </div>
              </div>
            </div>

            <div className="col col--3">
              <div className="card">
                <div className="card__header">
                  <h3>Failed Runs</h3>
                </div>
                <div className="card__body">
                  <div className={`metric-value ${data.ciMetrics.failedRuns === 0 ? 'success' : 'warning'}`}>
                    {data.ciMetrics.failedRuns}
                  </div>
                  <div className="metric-detail">Last 50 runs</div>
                </div>
              </div>
            </div>

            <div className="col col--3">
              <div className="card">
                <div className="card__header">
                  <h3>Flake Rate</h3>
                </div>
                <div className="card__body">
                  <div className="metric-value success">{data.ciMetrics.flakeRate.toFixed(1)}%</div>
                  <div className="metric-detail">Retry-based detection</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="margin-vert--lg">
          <h2>📈 Test Coverage Trend</h2>
          <div className="row">
            <div className="col col--6">
              <div className="card">
                <div className="card__header">
                  <h3>Current Coverage</h3>
                </div>
                <div className="card__body">
                  <div className={`metric-value ${data.coverageTrend[0].coverage >= 85 ? 'success' : 'warning'}`}>
                    {data.coverageTrend[0].coverage}%
                  </div>
                  <div className="metric-detail">
                    {data.coverageTrend[0].trend === 'up' ? '📈' : data.coverageTrend[0].trend === 'down' ? '📉' : '➡️'} {data.coverageTrend[0].trend.toUpperCase()}
                    <br />
                    Last updated: {new Date(data.coverageTrend[0].timestamp).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="margin-vert--lg">
          <h2>📦 NPM Package Stats</h2>
          <div className="row">
            <div className="col col--6">
              <div className="card">
                <div className="card__header">
                  <h3>Weekly Downloads</h3>
                </div>
                <div className="card__body">
                  <div className="metric-value">{data.npmStats.weeklyDownloads.toLocaleString()}</div>
                  <div className="metric-detail">Last 7 days</div>
                </div>
              </div>
            </div>

            <div className="col col--6">
              <div className="card">
                <div className="card__header">
                  <h3>Monthly Downloads</h3>
                </div>
                <div className="card__body">
                  <div className="metric-value">{data.npmStats.monthlyDownloads.toLocaleString()}</div>
                  <div className="metric-detail">Last 30 days</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <footer className="margin-vert--lg">
          <p>
            <strong>Last Updated:</strong> {new Date(data.generatedAt).toLocaleString()}
          </p>
          <p>
            <strong>Data Source:</strong> Collected nightly from GitHub API and npm registry.{' '}
            <a href="https://github.com/tosin2013/documcp/blob/main/src/scripts/collect-release-health.ts">
              View collection script
            </a>
          </p>
        </footer>
      </div>
    </Layout>
  );
}
