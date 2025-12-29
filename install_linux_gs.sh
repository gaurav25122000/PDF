#!/bin/bash

# Directory where the function code lives
FUNCTION_DIR="netlify/functions"
BIN_DIR="$FUNCTION_DIR/bin"

# Create bin directory if it doesn't exist
mkdir -p "$BIN_DIR"

echo "Downloading Ghostscript 9.53.3 for Linux x86_64..."
# Using a specific version from Artifex GitHub releases which is generally compatible
curl -L -o ghostscript.tgz https://github.com/ArtifexSoftware/ghostpdl-downloads/releases/download/gs9533/ghostscript-9.53.3-linux-x86_64.tgz

echo "Extracting..."
tar -xzf ghostscript.tgz

echo "Setting up binary..."
# Find the binary in the extracted files
GS_BIN=$(find . -type f -name "gs-*-linux-x86_64" | head -n 1)

if [ -z "$GS_BIN" ]; then
  # Fallback: sometimes it's just 'gs' or different name depending on archive structure
  # For 9.53.3 it might be inside a bin folder
  GS_BIN=$(find . -type f -name "gs" | head -n 1)
fi

if [ -n "$GS_BIN" ]; then
    echo "Found binary at $GS_BIN"
    mv "$GS_BIN" "$BIN_DIR/gs"
    chmod +x "$BIN_DIR/gs"
    echo "Success! Linux Ghostscript binary placed in $BIN_DIR/gs"
else
    echo "Error: Could not find extracted binary."
    ls -R
    exit 1
fi

echo "Cleaning up..."
rm ghostscript.tgz
rm -rf ghostscript-9.53.3-linux-x86_64 # cleanup dir if extracted
