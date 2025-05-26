#!/bin/bash

# Test and merge workflow for DialogLens features

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if branch name is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Please provide a branch name${NC}"
    echo "Usage: ./scripts/test-and-merge.sh <branch-name>"
    exit 1
fi

BRANCH=$1
CURRENT_BRANCH=$(git branch --show-current)

echo -e "${BLUE}Testing and merging branch: $BRANCH${NC}"

# Save current branch
echo -e "${BLUE}Current branch: $CURRENT_BRANCH${NC}"

# Checkout the feature branch
echo -e "${BLUE}Switching to $BRANCH...${NC}"
git checkout $BRANCH

if [ $? -ne 0 ]; then
    echo -e "${RED}Failed to checkout $BRANCH${NC}"
    exit 1
fi

# Run tests
echo -e "${BLUE}Running tests...${NC}"
bun run test:run

if [ $? -ne 0 ]; then
    echo -e "${RED}Tests failed! Not merging.${NC}"
    git checkout $CURRENT_BRANCH
    exit 1
fi

echo -e "${GREEN}All tests passed!${NC}"

# Merge main to get latest changes
echo -e "${BLUE}Merging latest from main...${NC}"
git merge main --no-edit

if [ $? -ne 0 ]; then
    echo -e "${RED}Merge conflict! Please resolve manually.${NC}"
    exit 1
fi

# Run tests again after merge
echo -e "${BLUE}Running tests after merge...${NC}"
bun run test:run

if [ $? -ne 0 ]; then
    echo -e "${RED}Tests failed after merge! Please fix.${NC}"
    exit 1
fi

# Switch to main and merge the feature branch
echo -e "${BLUE}Switching to main...${NC}"
git checkout main

echo -e "${BLUE}Merging $BRANCH into main...${NC}"
git merge $BRANCH --no-edit

if [ $? -ne 0 ]; then
    echo -e "${RED}Merge to main failed!${NC}"
    exit 1
fi

echo -e "${GREEN}Successfully merged $BRANCH into main!${NC}"

# Show the current status
echo -e "${BLUE}Current git status:${NC}"
git status --short

echo -e "${GREEN}Done! Feature $BRANCH has been tested and merged to main.${NC}"