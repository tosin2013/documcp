# Security Policy

## Supported Versions

We release security updates for the following versions of DocuMCP:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of DocuMCP seriously. If you believe you have found a security vulnerability, please follow these steps:

### 1. **Do Not Disclose Publicly**
Please do not disclose the vulnerability publicly until we have had time to investigate and provide a fix.

### 2. **Submit a Private Report**
Email your findings to [security@yourdomain.com] or create a private security advisory on GitHub.

### 3. **Include Details**
Please provide:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Any suggested fixes
- Your contact information

### 4. **Response Time**
We will:
- Acknowledge receipt within 48 hours
- Provide a preliminary assessment within 3 business days
- Keep you informed of our progress
- Work with you on public disclosure timing

## Security Best Practices

### For Users
- Keep your DocuMCP installation up to date
- Review and understand the permissions required
- Use secure communication channels
- Regularly audit your documentation deployment workflows

### For Developers
- Follow secure coding practices
- Use dependency scanning tools
- Regular security reviews of code
- Implement proper input validation
- Keep dependencies updated

## Security Considerations

### MCP Protocol Security
DocuMCP operates as a Model Context Protocol server. Please ensure:
- Proper authentication and authorization for MCP connections
- Secure transport layer (TLS/SSL) for network communications
- Regular review of MCP client permissions

### Documentation Deployment
When using DocuMCP for documentation deployment:
- Review generated GitHub Actions workflows
- Ensure proper secret management
- Validate deployment configurations
- Monitor deployment logs for anomalies

## Dependency Security

We regularly monitor our dependencies for security vulnerabilities:
- Automated dependency scanning with GitHub Dependabot
- Regular security updates
- Pinned dependency versions for stability

## Incident Response

In case of a security incident:
1. **Contain**: Isolate affected systems
2. **Assess**: Determine scope and impact
3. **Fix**: Develop and deploy patches
4. **Communicate**: Notify affected users
5. **Learn**: Conduct post-mortem analysis

## Contact

For security-related concerns:
- **Email**: security@yourdomain.com
- **PGP Key**: [Available upon request]
- **Response Time**: Within 48 hours for initial response

## Acknowledgments

We thank security researchers and users who help us keep DocuMCP secure through responsible disclosure.