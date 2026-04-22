#!/usr/bin/env sh

set -e

MANIFEST_FILE="manifest.json"

# Ensure the working tree is clean
if ! git diff --quiet || ! git diff --cached --quiet; then
  echo "Working tree is not clean. Please commit or stash your changes first."
  exit 1
fi

# Find the latest tag matching x.y.z
LATEST_TAG=$(git tag --list '[0-9]*.[0-9]*.[0-9]*' --sort=-v:refname | head -n 1)

if [ -z "$LATEST_TAG" ]; then
  echo "No git tags found matching format x.y.z"
  exit 1
fi

# Check if a custom version was provided as argument
if [ -n "$1" ]; then
  NEW_VERSION="$1"
  # Validate version format (basic check for x.y.z)
  if ! echo "$NEW_VERSION" | grep -qE '^[0-9]+\.[0-9]+\.[0-9]+$'; then
    echo "Error: Version must be in x.y.z format (e.g., 2.0.0)"
    exit 1
  fi
else
  # Default: auto-increment patch version
  IFS='.' read -r MAJOR MINOR PATCH <<EOF
$LATEST_TAG
EOF
  NEW_PATCH=$((PATCH + 1))
  NEW_VERSION="${MAJOR}.${MINOR}.${NEW_PATCH}"
fi

echo "Latest version: $LATEST_TAG"
echo "New version:    $NEW_VERSION"

# Update version in manifest.json
sed -i.bak -E "s/(\"version\"[[:space:]]*:[[:space:]]*\")[^\"]*(\")/\1${NEW_VERSION}\2/" "$MANIFEST_FILE"
rm -f "${MANIFEST_FILE}.bak"

# Commit the change
git add "$MANIFEST_FILE"
git commit -m "Bump version to ${NEW_VERSION}"

# Create new tag
git tag "${NEW_VERSION}"

# Push commit and tag
git push --atomic origin main "${NEW_VERSION}"

echo "Version ${NEW_VERSION} has been committed, tagged, and pushed"

