
# GTK Color Preview

A VS Code/VSCodium extension to preview GTK colors in CSS files.

## Features

- 🎨 **Inline preview**: Shows a circle with the exact color before each `@variable`
- 🎭 **Adaptive background**: Colors the variable's background with the real color (100% opaque) and automatically adjusts text to white or black for maximum contrast
- 📁 **@import support**: Resolves variables from imported files (e.g., `@import "colors.css"`)
- 🔍 **Hover info**: Shows the actual variable value on hover
- 🎯 **Automatic detection**: Works automatically when opening CSS files
- 🌈 **Multiple formats**: Supports hex (#2c0051), rgb(), and rgba() colors

## Requirements

- VS Code 1.85.0 or higher
- Or VSCodium 1.85.0 or higher

## Installation

### From VSIX
1. Download the `.vsix` file from [releases](https://github.com/your-username/gtk-color-preview/releases)
2. In VS Code/VSCodium, go to Extensions → ... → Install from VSIX
3. Select the downloaded file

### From Marketplace (coming soon)

## Usage

### Defining variables

In your colors file (e.g., `colors.css`):
```css
@define-color primary_hex #2c0051;
@define-color on_primary_container_hex #f8e9ff;
@define-color tertiary_container_hex #c2aa58;
@define-color dock_primary_rgb rgba(44, 0, 81, 0.75);
```

### Using variables

In your main CSS file:
```css
@import "colors.css";

window#waybar {
    background: alpha(@primary_hex, 0.55);
    color: @on_primary_container_hex;
    border: 1px solid @tertiary_container_hex;
}
```

### What you'll see:

- Dark variables (e.g., @primary_hex): Dark purple background with white text
- Light variables (e.g., @on_primary_container_hex): Light background with black text
- Decorative circle: A ● circle before each variable with the exact color
- Hover: Hover over a variable to see its actual value

### Release Notes
### 0.0.1
    🚀 Initial release
    ✨ Inline preview with color circles
    🎭 Adaptive backgrounds with automatic contrast
    📁 Basic @import support
    🔍 Hover info with variable values

### License

Distributed under the MIT License. See LICENSE for more information.
