ARGUMENTS = $(filter-out $@,$(MAKECMDGOALS))

# Add this at the beginning of your Makefile
.PHONY: help
help:
	@echo "Available commands:"
	@echo
	@echo "Bump version:"
	@echo "  bump <option>           - Bump version (option: major or minor or patch)"
	@echo "  bump-pre                - Bump prerelease version"
	@echo
	@echo "Changelog:"
	@echo "  changelog               - Update CHANGELOG.md with changes between the last two release commits"
	@echo
	@echo "npm:"
	@echo "  npm-publish             - Publish npm packages"
	@echo "  npm-dry                 - Dry-run npm package publish"
	@echo "  npm-prerelease          - Publish prerelease npm packages"
	@echo "  npm-un-prerelease       - Unpublish prerelease npm packages"
	@echo
	@echo "Release:"
	@echo "  release                 - Create a new release version (opens PR creation URL)"
	@echo "  release-manually        - Create a new release version manually"
	@echo "  release-rollback        - Rollback a release version"
	@echo
	@echo "Tagging:"
	@echo "  tag-delete              - Delete a version tag"
	@echo
	@echo "Version:"
	@echo "  version                 - Show current version"
	@echo
	@echo "WASM:"
	@echo "  wasm-build              - Build WASM package"
	@echo
	@echo "For more details on each command, check the Makefile"

# Bump version

bump:
	@echo "Bumping version..."
	@if [ "$(ARGUMENTS)" != "major" ] && [ "$(ARGUMENTS)" != "minor" ] && [ "$(ARGUMENTS)" != "patch" ]; then \
		echo "Error: Invalid argument, must be one of: major or minor or patch."; \
		exit 1; \
	fi
	@npm version $(ARGUMENTS) --git-tag-version=false

bump-pre:
	@echo "Bumping prerelease version..."
	@npm version prerelease --preid=prerelease --git-tag-version=false

# Changelog
# Install git cliff: https://git-cliff.org/docs/installation

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
	npm publish --dry-run --tag prerelease ;\

npm-prerelease: wasm-build
	npm publish --access public --tag prerelease ;\

npm-un-prerelease:
	version=$$(make version -s); \
	if ! echo "$$version" | grep -q "prerelease"; then \
		echo "Error: Cannot un-publish a release without a prerelease version ($$version)."; \
		exit 1; \
	fi
	npm unpublish sxo@$$version --force ;\

# Release

release:
	@node --test; \
	version=$$(make version -s); \
	release_branch="release/$$version"; \
	if [ -z "$$version" ]; then \
		echo "Error: Version argument is required. Usage: make release"; \
		exit 1; \
	fi; \
	if echo "$$version" | grep -q "prerelease"; then \
		echo "Error: Cannot create a release with a prerelease version ($$version)."; \
		exit 1; \
	fi; \
	if git rev-parse --verify "release/$$version" >/dev/null 2>&1; then \
		echo "Error: Release branch release/$$version already exists"; \
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
	if ! git checkout -b $$release_branch; then \
		echo "Error: Failed to create release branch $$release_branch"; \
		exit 1; \
	fi; \
	make changelog; \
	git add CHANGELOG.md; \
	git add package.json; \
	git commit -m "release: v$$version"; \
	git push --set-upstream origin $$release_branch; \
	git tag v$$version; \
	git push --tags; \

pre-release:
	@node --test; \
	make bump-pre; \
	version=$$(make version -s); \
	release_branch="pre-release/$$version"; \
	if [ -z "$$version" ]; then \
		echo "Error: Version argument is required. Usage: make pre-release"; \
		exit 1; \
	fi; \
	if ! echo "$$version" | grep -q "prerelease"; then \
		echo "Error: Can only create a pre-release with a prerelease version ($$version)."; \
		exit 1; \
	fi; \
	if git rev-parse --verify "pre-release/$$version" >/dev/null 2>&1; then \
		echo "Error: Pre-release branch pre-release/$$version already exists"; \
		exit 1; \
	fi; \
	if ! git checkout main; then \
		echo "Error: Failed to checkout main branch"; \
		exit 1; \
	fi; \
	if ! git checkout -b $$release_branch; then \
		echo "Error: Failed to create pre-release branch $$release_branch"; \
		exit 1; \
	fi; \
	git add package.json && \
	git commit -m "pre-release: v$$version"; \
	if ! git pull --rebase origin main; then \
		echo "Error: Failed to pull latest changes from main"; \
		exit 1; \
	fi; \

release-rollback:
	version=$$(make version -s); \
	@read -p "Are you sure you want to rollback the tag version $$version? [Y/n] " REPLY; \
    if [ "$$REPLY" = "Y" ] || [ "$$REPLY" = "y" ] || [ "$$REPLY" = "" ]; then \
        git reset --soft HEAD~1; \
		git reset HEAD CHANGELOG.md; \
		git checkout -- CHANGELOG.md; \
		git tag -d v$$version; \
		git push origin --delete v$$version; \
		git push --force-with-lease; \
    else \
        echo "Aborted."; \
    fi

# Tag

tag-delete:
	version=$$(make version -s); \
	@read -p "Are you sure you want to delete the tag version $$version? [Y/n] " REPLY; \
	if [ "$$REPLY" = "Y" ] || [ "$$REPLY" = "y" ] || [ "$$REPLY" = "" ]; then \
		git tag -d v$$version; \
		git push origin --delete v$$version; \
	else \
		echo "Aborted."; \
	fi

# Version

version:
	@npm pkg get version | tr -d '"' | tr -d 'v'

# WASM build

wasm-build:
	@npm run wasm-build

# catch anything and do nothing
%:
	@:
