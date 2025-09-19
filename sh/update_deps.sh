#!/bin/bash

# Text colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to extract latest version for a package
get_latest_version() {
    local pkg=$1
    cargo search "$pkg" | grep "^$pkg = " | cut -d'"' -f2
}

# List of dependencies
# Function to extract simple dependencies and those with features
extract_deps() {
    local file="$1"
    local in_deps=false
    local deps=()

    while IFS= read -r line; do
        # Check for dependencies section
        if [[ "$line" =~ ^\[dependencies\]$ ]]; then
            in_deps=true
            continue
        elif [[ "$line" =~ ^\[.*\]$ ]] && [ "$in_deps" = true ]; then
            # Exit if we hit another section
            break
        fi

        if [ "$in_deps" = true ]; then
            # Skip empty lines
            if [[ -z "${line// }" ]]; then
                continue
            fi

            # Extract package name for both simple and feature-based dependencies
            if [[ "$line" =~ ^([a-zA-Z_-]+)[[:space:]]*=.*$ ]]; then
                deps+=("${BASH_REMATCH[1]}")
            fi
        fi
    done < "$file"

    # Return the array elements joined by newlines
    printf "%s\n" "${deps[@]}"
}

# Check if Cargo.toml path was provided
# If no path provided, check current directory
if [ "$#" -ne 1 ]; then
    if [ -f "Cargo.toml" ]; then
        CARGO_TOML="Cargo.toml"
    else
        echo "No Cargo.toml found in current directory"
        echo "Usage: $0 path/to/Cargo.toml" 
        exit 1
    fi
else
    CARGO_TOML="$1"
fi

# Check if Cargo.toml exists at provided path
if [ ! -f "$CARGO_TOML" ]; then
    echo "Error: $CARGO_TOML not found"
    exit 1
fi

# Create array from the extract_deps output
# Using mapfile (bash 4+) to read lines into array
mapfile -t dependencies < <(extract_deps "$CARGO_TOML" | sort)

# Print the array for verification
echo -e "\nDependencies array contains:"
echo "----------------------------"
printf '%s\n' "${dependencies[@]}"

# Example of using the array in a loop
echo -e "\nProcessing each dependency:"
echo "---------------------------"
for dep in "${dependencies[@]}"; do
    echo "📦 Processing: $dep"
done

# Example of accessing array length
echo -e "\nTotal number of dependencies: ${#dependencies[@]}\n"

echo -e "${BLUE}Checking and updating dependencies...${NC}"
echo "----------------------------------------"

# Read current Cargo.toml
content=$(cat "$CARGO_TOML")

# Update each dependency
for dep in "${dependencies[@]}"; do
    echo -e "📦 ${BLUE}Checking $dep...${NC}"
    latest_version=$(get_latest_version "$dep")

    if [ ! -z "$latest_version" ]; then
        echo -e "${GREEN}Found version: $latest_version${NC}"

        # Handle serde with its features
        if [ "$dep" == "serde" ]; then
            content=$(echo "$content" | sed "s/$dep = { version = \"[^\"]*\"/$dep = { version = \"$latest_version\"/")
        else
            content=$(echo "$content" | sed "s/$dep = \"[^\"]*\"/$dep = \"$latest_version\"/")
        fi
    else
        echo "Could not fetch version for $dep"
    fi
    echo "----------------------------------------"
done

# Write updated content back to Cargo.toml
echo "$content" > "$CARGO_TOML"

echo -e "${BLUE}Running cargo update...${NC}"
cargo update --verbose

echo -e "${GREEN}✨ Dependencies updated successfully!${NC}"