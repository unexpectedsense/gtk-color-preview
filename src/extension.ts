import * as vscode from 'vscode';
import { ImportResolver } from './importResolver';

let circleDecorationType: vscode.TextEditorDecorationType;
let context: vscode.ExtensionContext;
const importResolver = new ImportResolver();

export function activate(extContext: vscode.ExtensionContext) {
    context = extContext;
    console.log('Extensión GTK Color Preview activada');
    
    // Ya no necesitamos circleDecorationType con color fijo
    // porque ahora el color se asignará dinámicamente
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
                // Determinar el color del círculo basado en el fondo
                // Siempre usamos el color original para el círculo
                const circleColor = hexColor;
                
                // Decoración para el círculo
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
                
                // Para el fondo, usar color sólido (FF = 100% opacidad)
                const bgColor = hexColor + 'FF';
                
                if (!bgRangesByColor.has(bgColor)) {
                    bgRangesByColor.set(bgColor, []);
                }
                bgRangesByColor.get(bgColor)!.push(range);
            }
        }
    }
    
    editor.setDecorations(circleDecorationType, circleDecorations);
    
    // Aplicar fondos con color de texto automático
    bgRangesByColor.forEach((ranges, color) => {
        // Extraer el color base (sin el FF de opacidad)
        const baseColor = color.slice(0, 7);
        
        // Determinar si el fondo es claro u oscuro
        const light = isLightColor(baseColor);
        
        // Crear decoración con color de texto automático
        const decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: color,
            borderRadius: '3px',
            border: 'none',
            color: light ? '#000000' : '#ffffff', // Texto negro en fondos claros, blanco en oscuros
            fontWeight: 'bold' // Opcional: hacer el texto más legible
        });
        
        editor.setDecorations(decorationType, ranges);
        if (context) {
            context.subscriptions.push(decorationType);
        }
    });
}

// Función para determinar si un color es claro u oscuro
function isLightColor(hexColor: string): boolean {
    // Asegurarse de que el color tenga el formato correcto (#RRGGBB)
    let hex = hexColor.replace('#', '');
    
    // Convertir hex a RGB
    let r = parseInt(hex.slice(0, 2), 16);
    let g = parseInt(hex.slice(2, 4), 16);
    let b = parseInt(hex.slice(4, 6), 16);
    
    // Fórmula de luminosidad perceptiva (WCAG)
    // https://www.w3.org/WAI/GL/wiki/Relative_luminance
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    
    // Si la luminosidad es mayor a 0.5, es un color claro
    // Ajusta este umbral si quieres más o menos sensibilidad
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
