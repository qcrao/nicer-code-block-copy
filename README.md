# Nicer Code Block Copy for Roam Research

![Nicer Code Block Copy](https://github.com/qcrao/nicer-code-block-copy/blob/main/assets/code-block-copy.gif?raw=true)

> **Inspiration**: This project is inspired by [roam-depot-copy-code-block](https://github.com/8bitgentleman/roam-depot-copy-code-block), with numerous improvements to interaction experience and functionality.

A Roam Research extension that adds enhanced copy functionality to both inline code snippets, code blocks, and highlighted text.

## Improvements & Enhancements

Compared to the original project, this extension offers:

- **More Elegant Interaction Design**:

  - Copy buttons for inline code and highlighted text only appear on hover, reducing visual clutter
  - Dynamic feedback when copying is successful (changes to a checkmark icon)
  - More aesthetically pleasing icons

- **Enhanced Functionality**:

  - Added support for copying highlighted text
  - Smarter DOM change handling to ensure copy functionality works correctly when page content changes
  - More efficient performance optimization (debounce processing)
  - Fixed the bug in the original project where code blocks couldn't be copied

- **Better Customization**:
  - Separate controls for inline code and highlight text copy functionality

## Features

- Adds copy buttons to code blocks in Roam Research
- For inline code and highlighted text, buttons appear only when you hover over the text (reduced visual clutter)
- Shows visual feedback when content is copied (changes to a checkmark)
- Clean, minimal interface that doesn't distract from your notes

## Installation

1. Go to Roam Research's "Settings" > "Roam Depot"
2. Find "Nicer Code Block Copy" in the list of available plugins
3. Click "Install"

## Usage

- For code blocks: Click the copy button in the code block's toolbar
- For inline code: Hover over any inline code to see the copy button appear, then click to copy
- For highlighted text: Hover over any highlighted text to see the copy button appear, then click to copy

## Settings

- **Enable copy button on inline code blocks**: Toggle this setting to show/hide copy buttons for inline code
- **Enable copy button on highlighted text**: Toggle this setting to show/hide copy buttons for highlighted text

## Acknowledgements

Thanks to [8bitgentleman](https://github.com/8bitgentleman) for the original project:

https://github.com/8bitgentleman/roam-depot-copy-code-block
