import * as vscode from 'vscode';
import { ImportResolver } from './importResolver';

let circleDecorationType: vscode.TextEditorDecorationType;
let context: vscode.ExtensionContext;
const importResolver = new ImportResolver();

export function activate(extContext: vscode.ExtensionContext) {
    context = extContext;
    console.log('GTK Color Preview extension enabled');
    
    circleDecorationType = vscode.window.createTextEditorDecorationType({
        before: {
            contentText: '●',
            margin: '0 5px 0 0',
            width: '16px',
            height: '16px',
            textDecoration: 'none',
            fontWeight: 'bold'
        }
    });

    if (vscode.window.activeTextEditor) {
        updateDecorations(vscode.window.activeTextEditor);
    }
    
    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(editor => {
            if (editor) {
                updateDecorations(editor);
            }
        })
    );
    
    context.subscriptions.push(
        vscode.workspace.onDidChangeTextDocument(event => {
            const editor = vscode.window.activeTextEditor;
            if (editor && event.document === editor.document) {
                updateDecorations(editor);
            }
        })
    );
    
    context.subscriptions.push(
        vscode.languages.registerHoverProvider('css', {
            async provideHover(document, position) {
                const range = document.getWordRangeAtPosition(position, /@[a-zA-Z0-9_-]+/);
                if (!range) {return null; };
                
                const word = document.getText(range);
                const varName = word.substring(1);
                
                const colorMap = await importResolver.resolveImports(document);
                const colorValue = colorMap.get(varName);
                
                if (colorValue) {
                    const hexColor = extractColorValue(colorValue) || colorValue;
                    return new vscode.Hover(`**${varName}** = ${colorValue}\n\n![color](https://via.placeholder.com/15/${hexColor.replace('#', '')}/000000?text=+)`);
                }
                
                return null;
            }
        })
    );
}

async function updateDecorations(editor: vscode.TextEditor) {
    if (!editor || editor.document.languageId !== 'css') {
        return;
    }
    
    const colorMap = await importResolver.resolveImports(editor.document);
    const text = editor.document.getText();
    const circleDecorations: vscode.DecorationOptions[] = [];
    const bgRangesByColor = new Map<string, vscode.Range[]>();
    
    const variableRegex = /@([a-zA-Z0-9_-]+)/g;
    let match;
    
    while ((match = variableRegex.exec(text)) !== null) {
        const varName = match[1];
        const colorValue = colorMap.get(varName);
        
        if (colorValue) {
            const startPos = editor.document.positionAt(match.index);
            const endPos = editor.document.positionAt(match.index + match[0].length);
            const range = new vscode.Range(startPos, endPos);
            
            const hexColor = extractColorValue(colorValue);
            
            if (hexColor) {
                // Determine the circle color based on the background
                // We always use the original color for the circle
                const circleColor = hexColor;
                
                // Decoration for the circle
                circleDecorations.push({
                    range: range,
                    renderOptions: {
                        before: {
                            contentText: '●',
                            color: circleColor,
                            fontWeight: 'bold',
                            margin: '0 5px 0 0',
                            width: '16px',
                            height: '16px'
                        }
                    }
                });
                
                // For the background, use solid color (FF = 100% opacity)
                const bgColor = hexColor + 'FF';
                
                if (!bgRangesByColor.has(bgColor)) {
                    bgRangesByColor.set(bgColor, []);
                }
                bgRangesByColor.get(bgColor)!.push(range);
            }
        }
    }
    
    editor.setDecorations(circleDecorationType, circleDecorations);
    
    // Apply backgrounds with automatic text color
    bgRangesByColor.forEach((ranges, color) => {
        // Extract the base color (without the opacity filter)
        const baseColor = color.slice(0, 7);
        
        // Determine if the background is light or dark
        const light = isLightColor(baseColor);
        
        // Create decoration with automatic text color
        const decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: color,
            borderRadius: '3px',
            border: 'none',
            color: light ? '#000000' : '#ffffff', // Black text on light backgrounds, white on dark backgrounds
            fontWeight: 'bold' // Make the text more readable
        });
        
        editor.setDecorations(decorationType, ranges);
        if (context) {
            context.subscriptions.push(decorationType);
        }
    });
}

// Function to determine if a color is light or dark
function isLightColor(hexColor: string): boolean {
    // Make sure the color is in the correct format (#RRGGBB)
    let hex = hexColor.replace('#', '');
    
    // Convert hex to RGB
    let r = parseInt(hex.slice(0, 2), 16);
    let g = parseInt(hex.slice(2, 4), 16);
    let b = parseInt(hex.slice(4, 6), 16);
    
    // Perceptual brightness formula (WCAG)
    // https://www.w3.org/WAI/GL/wiki/Relative_luminance
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    
    // If the luminosity is greater than 0.5, it is a light color
    // Adjust this threshold if you want more or less sensitivity.
    return luminance > 0.5;
}

function extractColorValue(value: string): string | undefined {
    value = value.trim();
    
    const rgbaMatch = value.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)/);
    if (rgbaMatch) {
        const [_, r, g, b] = rgbaMatch;
        return `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`;
    }
    
    const hex6Match = value.match(/#([0-9A-Fa-f]{6})\b/);
    if (hex6Match) {
        return hex6Match[0];
    }
    
    const hex3Match = value.match(/#([0-9A-Fa-f]{3})\b/);
    if (hex3Match) {
        const hex = hex3Match[1];
        return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`;
    }
    
    const rgbMatch = value.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (rgbMatch) {
        const [_, r, g, b] = rgbMatch;
        return `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`;
    }
    
    return undefined;
}

export function deactivate() {}
