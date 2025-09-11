---
name: "🚀 Fix npm Package Publishing"
description: "Verify and fix npm package publishing configuration in release workflow"
labels: ["bug", "release", "npm", "high-priority"]
assignees:
  - "tosinakinosho"

---

## 🚨 Problem Description

The release workflow is configured to publish to npm, but the package "documcp" is not found on the npm registry, indicating either publication failures or configuration issues.

**Current Behavior:**
- Release workflow includes npm publish step
- NPM_TOKEN secret is presumably configured
- However, package is not accessible on npm registry
- No error handling or verification for publication failures

**Impact:**
- Users cannot install via `npm install documcp`
- Release process is incomplete
- Missing distribution channel for the package

## 🎯 Expected Behavior

- npm package "documcp" should be publicly accessible
- Release workflow should successfully publish new versions
- Publication failures should be properly handled and reported
- Package should be installable via `npm install documcp`

## 🔧 Solution Proposal

### Phase 1: Investigation
1. **Verify NPM_TOKEN secret** exists in GitHub repository settings
2. **Check npm registry access** with current token
3. **Test publication locally** using dry-run mode
4. **Review npm account permissions** and package ownership

### Phase 2: Implementation
1. **Add publication verification** step to release workflow:
   ```yaml
   - name: Verify npm publication
     run: |
       npm view documcp@${{ github.ref_name }} || echo "Package not yet published"
   ```

2. **Implement error handling** for publication failures:
   ```yaml
   - name: Publish to npm
     run: npm publish || echo "Publication failed"
     env:
       NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
   ```

3. **Add retry mechanism** for transient failures

### Phase 3: Validation
1. **Test complete release flow** from tag to publication
2. **Verify package accessibility** on npm registry
3. **Test installation** via `npm install documcp`
4. **Document installation instructions** in README

## 📋 Acceptance Criteria

- [ ] npm package "documcp" is publicly accessible on npm registry
- [ ] Release workflow successfully publishes new versions
- [ ] Publication failures are properly logged and handled
- [ ] Package can be installed via `npm install documcp`
- [ ] README includes npm installation instructions

## 🔍 Technical Details

**Relevant Files:**
- `.github/workflows/release.yml` (lines 122-126)
- `package.json` (publish configuration)
- GitHub repository secrets (NPM_TOKEN)

**Dependencies:**
- Requires valid npm account with publish permissions
- Needs NPM_TOKEN secret with publish access
- May require package namespace configuration

## ⚠️ Potential Issues

1. **npm organization permissions** - Package may need to be under user/organization scope
2. **2FA requirements** - npm may require 2FA for publication
3. **Name availability** - "documcp" name might be taken
4. **Token permissions** - NPM_TOKEN might have insufficient permissions

## 📚 References

- [npm Publishing Documentation](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
- [GitHub Actions npm Authentication](https://docs.github.com/en/actions/publishing-packages/publishing-nodejs-packages)
- [npm Token Management](https://docs.npmjs.com/creating-and-viewing-access-tokens)

## 🎪 Priority: High

This blocks the primary distribution channel for the package and affects user adoption.