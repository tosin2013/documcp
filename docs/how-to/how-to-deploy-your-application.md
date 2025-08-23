# How to Deploy Your Application

This guide covers deployment options and best practices for documcp.

## Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Environment variables configured
- [ ] Production dependencies installed
- [ ] Build process successful
- [ ] Security vulnerabilities addressed

## Deployment Options

### Option 1: GitHub Pages (Static Sites)

1. Build your application:
   ```bash
   npm run build
   ```

2. Deploy to GitHub Pages:
   ```bash
   npm run deploy
   ```

### Option 2: Cloud Platforms

#### Vercel
```bash
vercel --prod
```

#### Netlify
```bash
netlify deploy --prod
```

#### Heroku
```bash
git push heroku main
```

### Option 3: Docker Container

1. Build the Docker image:
   ```bash
   docker build -t documcp .
   ```

2. Run the container:
   ```bash
   docker run -p 3000:3000 documcp
   ```

## Continuous Deployment

### GitHub Actions

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run build
      - run: npm run deploy
```

## Post-Deployment

1. Verify deployment success
2. Run smoke tests
3. Monitor application logs
4. Check performance metrics
