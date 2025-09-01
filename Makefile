ARGUMENTS = $(filter-out $@,$(MAKECMDGOALS))

.PHONY: help ensure-clean \
        changelog \
        npm-publish npm-dry npm-prerelease npm-un-prerelease \
        release release-patch release-minor release-major release-tag pre-release release-rollback \
        tag-delete version wasm-build

# Help

help:
	@echo "Available commands:"
	@echo
	@echo "Changelog:"
	@echo "  changelog                - Update CHANGELOG.md using changes since the last 'release:' commit"
	@echo
	@echo "npm:"
	@echo "  npm-publish              - Publish npm package(s)"
	@echo "  npm-dry                  - Dry-run npm publish"
	@echo "  npm-prerelease           - Publish prerelease npm package(s)"
	@echo "  npm-un-prerelease        - Unpublish a prerelease npm version (force)"
	@echo
	@echo "Release:"
	@echo "  release [major|minor|patch] - Create release branch, bump inside it, generate changelog, push branch (default: patch)"
	@echo "  release-patch            - Alias for 'release patch'"
	@echo "  release-minor            - Alias for 'release minor'"
	@echo "  release-major            - Alias for 'release major'"
	@echo "  release-tag              - Tag main HEAD as v<version> after the release PR is merged"
	@echo "  release-rollback         - Rollback the last release commit and delete its tag (if present)"
	@echo
	@echo "Tagging:"
	@echo "  tag-delete               - Delete the tag for the current version"
	@echo
	@echo "Version:"
	@echo "  version                  - Show current version from package.json"
	@echo
	@echo "WASM:"
	@echo "  wasm-build               - Build WASM package"
	@echo
	@echo "Notes:"
	@echo "  - Single source of truth for version: package.json"
	@echo "  - Do NOT bump manually before 'make release'. The release target bumps inside a dedicated branch."
	@echo "  - Tags are created only after the PR is merged to main via 'make release-tag'."

# Ensure clean working tree

ensure-clean:
	@if [ -n "$$(git status --porcelain)" ]; then \
		echo "Error: Working tree is dirty. Please commit or stash your changes."; \
		git status --porcelain; \
		exit 1; \
	fi



# Changelog
# Requires git-cliff: https://git-cliff.org/docs/installation

changelog:
	@node --test; \
	version=$$(make version -s); \
	release_commit=$$(git log --grep="release: " --format="%H" -n 1); \
	if [ -z "$$release_commit" ]; then \
		echo "Error: No 'release' commit found."; \
		exit 1; \
	fi; \
	last_commit=$$(git log --format="%H" -n 1); \
	git cliff $$release_commit..$$last_commit --tag $$version --prepend CHANGELOG.md; \
	echo "CHANGELOG.md has been updated with changes between commits:"; \
	echo "Last Commit: $$last_commit"; \
	echo "Previous Release Commit: $$release_commit"

# npm

npm-publish: wasm-build
	npm publish --access public

npm-dry: wasm-build
	npm publish --dry-run --tag prerelease

npm-prerelease: wasm-build
	npm publish --access public --tag prerelease

npm-un-prerelease:
	@version=$$(make version -s); \
	if ! echo "$$version" | grep -q "prerelease"; then \
		echo "Error: Cannot un-publish a release without a prerelease version ($$version)."; \
		exit 1; \
	fi; \
	npm unpublish sxo@$$version --force

# Release: branch-first, bump-inside, no tag here
# Usage: make release [major|minor|patch]  (default: patch)

release: ensure-clean
	@node --test; \
	bump="$(ARGUMENTS)"; \
	if [ -z "$$bump" ]; then bump="patch"; fi; \
	if [ "$$bump" != "major" ] && [ "$$bump" != "minor" ] && [ "$$bump" != "patch" ]; then \
		echo "Error: Invalid bump. Use: major | minor | patch"; \
		exit 1; \
	fi; \
	if ! git checkout main; then \
		echo "Error: Failed to checkout main branch"; \
		exit 1; \
	fi; \
	if ! git pull --rebase origin main; then \
		echo "Error: Failed to pull latest changes from main"; \
		exit 1; \
	fi; \
	if ! git checkout -b release/tmp; then \
		echo "Error: Failed to create temporary release branch"; \
		exit 1; \
	fi; \
	npm version $$bump --git-tag-version=false; \
	version=$$(make version -s); \
	if echo "$$version" | grep -q "prerelease"; then \
		echo "Error: Cannot create a release with a prerelease version ($$version)."; \
		exit 1; \
	fi; \
	if git rev-parse --verify "release/$$version" >/dev/null 2>&1 || \
	   git ls-remote --exit-code --heads origin "release/$$version" >/dev/null 2>&1; then \
		echo "Error: Release branch release/$$version already exists"; \
		exit 1; \
	fi; \
	git branch -m "release/$$version"; \
	make changelog; \
	git add CHANGELOG.md package.json; \
	git commit -m "release: v$$version"; \
	git push --set-upstream origin "release/$$version"; \
	echo; \
	echo "Release branch pushed: release/$$version"; \
	echo "Open a PR to main."

# Convenience aliases

release-patch:
	@$(MAKE) release patch

release-minor:
	@$(MAKE) release minor

release-major:
	@$(MAKE) release major

# Tag main after the release PR is merged

release-tag: ensure-clean
	@node --test; \
	if ! git checkout main; then \
		echo "Error: Failed to checkout main branch"; \
		exit 1; \
	fi; \
	if ! git pull --rebase origin main; then \
		echo "Error: Failed to pull latest changes from main"; \
		exit 1; \
	fi; \
	version=$$(make version -s); \
	if [ -z "$$version" ]; then \
		echo "Error: Could not read version from package.json"; \
		exit 1; \
	fi; \
	if echo "$$version" | grep -q "prerelease"; then \
		echo "Error: Refusing to tag a prerelease version ($$version)."; \
		exit 1; \
	fi; \
	if git rev-parse "v$$version" >/dev/null 2>&1; then \
		echo "Error: Tag v$$version already exists"; \
		exit 1; \
	fi; \
	git tag -a "v$$version" -m "release: v$$version"; \
	git push --tags; \
	echo "Tagged and pushed v$$version"

# Pre-release: bump to prerelease inside a new branch and push it

pre-release: ensure-clean
	@node --test; \
	if ! git checkout main; then \
		echo "Error: Failed to checkout main branch"; \
		exit 1; \
	fi; \
	if ! git pull --rebase origin main; then \
		echo "Error: Failed to pull latest changes from main"; \
		exit 1; \
	fi; \
	if ! git checkout -b pre-release/tmp; then \
		echo "Error: Failed to create temporary pre-release branch"; \
		exit 1; \
	fi; \
	npm version prerelease --preid=prerelease --git-tag-version=false; \
	version=$$(make version -s); \
	if ! echo "$$version" | grep -q "prerelease"; then \
		echo "Error: Expected a prerelease version, got $$version"; \
		exit 1; \
	fi; \
	if git rev-parse --verify "pre-release/$$version" >/dev/null 2>&1 || \
	   git ls-remote --exit-code --heads origin "pre-release/$$version" >/dev/null 2>&1; then \
		echo "Error: Pre-release branch pre-release/$$version already exists"; \
		exit 1; \
	fi; \
	git branch -m "pre-release/$$version"; \
	git add package.json; \
	git commit -m "pre-release: v$$version"; \
	git push --set-upstream origin "pre-release/$$version"; \
	echo; \
	echo "Pre-release branch pushed: pre-release/$$version"

# Release rollback (unchanged behavior)

release-rollback:
	@version=$$(make version -s); \
	read -p "Are you sure you want to rollback the tag version $$version? [Y/n] " REPLY; \
	if [ "$$REPLY" = "Y" ] || [ "$$REPLY" = "y" ] || [ "$$REPLY" = "" ]; then \
		git reset --soft HEAD~1; \
		git reset HEAD CHANGELOG.md; \
		git checkout -- CHANGELOG.md; \
		git tag -d v$$version || true; \
		git push origin --delete v$$version || true; \
		git push --force-with-lease; \
	else \
		echo "Aborted."; \
	fi

# Tag

tag-delete:
	@version=$$(make version -s); \
	read -p "Are you sure you want to delete the tag version $$version? [Y/n] " REPLY; \
	if [ "$$REPLY" = "Y" ] || [ "$$REPLY" = "y" ] || [ "$$REPLY" = "" ]; then \
		git tag -d v$$version || true; \
		git push origin --delete v$$version || true; \
	else \
		echo "Aborted."; \
	fi

# Version

version:
	@npm pkg get version | tr -d '"' | tr -d 'v'

# WASM build

wasm-build:
	@npm run wasm-build

# Catch anything and do nothing
%:
	@:
