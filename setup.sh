#!/bin/bash
set -e

GEMINI_KEY="${VITE_GEMINI_KEY:-your_gemini_key_here}"
REPO_NAME="seller-signal-ai"

echo "🚀 SellerSignal AI — Deploy Script"
echo "=================================="

# 1. Create .env
echo "VITE_GEMINI_KEY=$GEMINI_KEY" > .env
echo "✓ .env created"

# 2. Install dependencies
echo "📦 Installing dependencies..."
npm install

# 3. Git init & push
echo "📤 Creating GitHub repo..."
git init
git add .
git commit -m "🚀 SellerSignal AI - Initial deploy"

# Create repo and push (requires gh CLI)
if command -v gh &> /dev/null; then
  gh repo create $REPO_NAME --public --source=. --push
  echo "✓ GitHub repo created: $REPO_NAME"
else
  echo "⚠️  gh CLI not found. Run: brew install gh && gh auth login"
  echo "Then re-run: bash setup.sh"
  exit 1
fi

# 4. Deploy to Vercel
echo "🌐 Deploying to Vercel..."
if command -v vercel &> /dev/null; then
  vercel --prod --yes \
    --env VITE_GEMINI_KEY="$GEMINI_KEY"
  echo "✅ DONE! Your app is live on Vercel!"
else
  echo "📋 Installing Vercel CLI..."
  npm i -g vercel
  vercel --prod --yes \
    --env VITE_GEMINI_KEY="$GEMINI_KEY"
fi

