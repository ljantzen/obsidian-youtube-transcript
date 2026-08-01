# Common developer tasks for obsidian-youtube-transcript.
# Run `just` or `just --list` to see all available recipes.

set shell := ["bash", "-euo", "pipefail", "-c"]

# List available recipes
default:
    @just --list

# Install dependencies
install:
    npm install

# Build in watch mode, rebuilding on save
dev:
    npm run dev

# Type-check and produce a production build (main.js)
build:
    npm run build

# Type-check only, no bundle output
typecheck:
    npx tsc -noEmit -skipLibCheck

# Run the unit test suite once
test:
    npm test

# Run the unit test suite in watch mode
test-watch:
    npm run test:watch

# Run the unit test suite with coverage
test-coverage:
    npm run test:coverage

# Lint the codebase
lint:
    npm run lint

# Lint and auto-fix what ESLint can fix
lint-fix:
    npm run lint:fix

# Run everything CI should check: lint, typecheck, tests
check: lint typecheck test

# Bump manifest.json, commit, tag, and push (see release.sh / RELEASE.md).
# Omit VERSION to auto-increment the patch version.
release VERSION="":
    ./release.sh {{VERSION}}

# Remove build artifacts and coverage output
clean:
    rm -rf main.js main.js.map coverage .nyc_output

# Remove node_modules and build artifacts, then reinstall
nuke: clean
    rm -rf node_modules
    npm install
