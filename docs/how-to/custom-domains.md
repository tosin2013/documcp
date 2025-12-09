---
documcp:
  last_updated: "2025-11-20T00:46:21.950Z"
  last_validated: "2025-12-09T19:41:38.581Z"
  auto_updated: false
  update_frequency: monthly
  validated_against_commit: 306567b32114502c606244ad6c2930360bcd4201
---

# How to Set Up Custom Domains

This guide shows you how to configure custom domains for your DocuMCP-deployed documentation site.

## Quick Setup

```bash
# Prompt DocuMCP:
"set up custom domain for my documentation site"
```

## Custom Domain Overview

DocuMCP supports custom domain configuration for professional documentation sites:

### Domain Types

- **Subdomains**: `docs.yourcompany.com`
- **Root Domains**: `yourcompany.com`
- **Path-based**: `yourcompany.com/docs`

### Requirements

- Domain ownership verification
- DNS configuration access
- GitHub Pages enabled
- SSL certificate (automatic with GitHub Pages)

## Setup Methods

### Method 1: Automated Setup (Recommended)

```bash
# Complete domain setup:
"configure custom domain docs.example.com for my site"
```

This will:

1. Guide you through DNS configuration
2. Set up GitHub Pages custom domain
3. Configure SSL certificate
4. Test domain connectivity
5. Set up redirects if needed

### Method 2: Manual Configuration

#### Step 1: DNS Configuration

Add the following DNS records to your domain:

**For Subdomain (docs.example.com):**

```
Type: CNAME
Name: docs
Value: yourusername.github.io
```

> **Note**: Replace `yourusername` with your GitHub username or organization name.

**For Root Domain (example.com):**

```
Type: A
Name: @
Value: 185.199.108.153
Value: 185.199.109.153
Value: 185.199.110.153
Value: 185.199.111.153
```

#### Step 2: GitHub Pages Configuration

1. Go to your repository settings
2. Navigate to "Pages" section
3. Enter your custom domain
4. Enable "Enforce HTTPS"

#### Step 3: Verification

```bash
# Verify domain setup:
"verify my custom domain configuration"
```

## Domain Configuration Examples

### Subdomain Setup

```yaml
# Custom domain configuration
domain:
  type: subdomain
  name: "docs.example.com"
  redirects:
    - from: "example.com/docs"
      to: "docs.example.com"
```

### Root Domain Setup

```yaml
# Root domain configuration
domain:
  type: root
  name: "example.com"
  path: "/docs"
  ssl: true
```

## Advanced Configuration

### Multiple Domains

```bash
# Set up multiple domains:
"configure domains docs.example.com and help.example.com"
```

### Redirects

```bash
# Set up redirects:
"redirect old-domain.com to new-domain.com"
```

### SSL Configuration

```bash
# Verify SSL setup:
"check SSL certificate for my domain"
```

## Troubleshooting

### Common Issues

**Problem**: Domain not resolving
**Solution**: Check DNS propagation (up to 48 hours)

**Problem**: SSL certificate issues
**Solution**: Verify GitHub Pages settings and DNS

**Problem**: Redirects not working
**Solution**: Check CNAME vs A record configuration

**Problem**: Mixed content warnings
**Solution**: Ensure all resources use HTTPS

### DNS Troubleshooting

```bash
# Check DNS propagation:
dig docs.example.com
nslookup docs.example.com

# Test connectivity:
curl -I https://docs.example.com
```

## Security Considerations

### HTTPS Enforcement

- Always enable HTTPS in GitHub Pages
- Use HSTS headers for security
- Monitor certificate expiration

### Access Control

- Configure appropriate permissions
- Set up authentication if needed
- Monitor access logs

## Performance Optimization

### CDN Configuration

```bash
# Optimize with CDN:
"set up CDN for my custom domain"
```

### Caching Headers

```yaml
# Cache configuration
caching:
  static_assets: "1 year"
  html_pages: "1 hour"
  api_responses: "5 minutes"
```

## Monitoring

### Domain Health

```bash
# Monitor domain health:
"set up monitoring for my custom domain"
```

### SSL Monitoring

```bash
# Monitor SSL certificate:
"monitor SSL certificate for my domain"
```

## Best Practices

1. **Use Subdomains**: Easier to manage than root domains
2. **Enable HTTPS**: Essential for security and SEO
3. **Set Up Redirects**: Maintain old URLs for SEO
4. **Monitor Uptime**: Track domain availability
5. **Document Changes**: Keep DNS records documented

## Next Steps

- [Site Monitoring](site-monitoring.md)
- [SEO Optimization](seo-optimization.md)
- [Analytics Setup](analytics-setup.md)
- [Performance Optimization](performance-optimization.md)
