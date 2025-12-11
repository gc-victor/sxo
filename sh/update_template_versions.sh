#!/usr/bin/env bash
set -euo pipefail

# Usage: ./update_template_versions.sh <version>
# Updates the "sxo" dependency version in all template package.json files
#
# Note: Template lock files are intentionally ignored (see .gitignore).
# Template consumers should run their own install to generate fresh lock files.

if [ $# -ne 1 ]; then
  echo "Usage: $0 <version>" >&2
  exit 1
fi

VERSION="$1"
TEMPLATES_DIR="templates"

if [ ! -d "$TEMPLATES_DIR" ]; then
  echo "Error: templates directory not found" >&2
  exit 1
fi

echo "Updating sxo version to $VERSION in template package.json files..."
echo ""

# Find all template directories
for template_dir in "$TEMPLATES_DIR"/*; do
  if [ -d "$template_dir" ]; then
    pkg_file="$template_dir/package.json"
    
    if [ ! -f "$pkg_file" ]; then
      continue
    fi
    
    template_name=$(basename "$template_dir")
    
    # Update package.json
    node -e "
      const fs = require('fs');
      const path = '$pkg_file';
      const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
      if (pkg.dependencies && pkg.dependencies.sxo) {
        pkg.dependencies.sxo = '$VERSION';
        fs.writeFileSync(path, JSON.stringify(pkg, null, 4) + '\n');
        console.log('✓ Updated $template_name/package.json');
      } else {
        console.log('⊘ Skipped $template_name (no sxo dependency)');
      }
    "
  fi
done

echo ""
echo "Template version update complete."
echo ""
echo "Note: Lock files are gitignored for templates. Template consumers"
echo "      will generate their own lock files when running install commands."

