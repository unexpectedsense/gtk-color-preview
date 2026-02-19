import * as vscode from 'vscode';
import * as path from 'path';

export class ImportResolver {
    private colorMap: Map<string, string> = new Map();
    private processedFiles: Set<string> = new Set();

    async resolveImports(document: vscode.TextDocument): Promise<Map<string, string>> {
        this.colorMap.clear();
        this.processedFiles.clear();
        await this.processFile(document);
        return this.colorMap;
    }

    private async processFile(document: vscode.TextDocument): Promise<void> {
        // Evitar procesar el mismo archivo múltiples veces
        if (this.processedFiles.has(document.fileName)) {
            return;
        }
        this.processedFiles.add(document.fileName);

        const text = document.getText();

        // 1. Primero, buscar definiciones de color en este archivo
        this.parseColorDefinitions(text);

        // 2. Luego, buscar y procesar imports
        await this.processImports(document, text);
    }

    private parseColorDefinitions(text: string): void {
        const defineColorRegex = /@define-color\s+([a-zA-Z0-9_-]+)\s+([^;]+);/g;
        let match;

        while ((match = defineColorRegex.exec(text)) !== null) {
            const [_, name, value] = match;
            this.colorMap.set(name, value.trim());
            console.log(`Variable importada: ${name} = ${value}`);
        }
    }

    private async processImports(document: vscode.TextDocument, text: string): Promise<void> {
        const importRegex = /@import\s+["']([^"']+)["'];/g;
        let match;

        while ((match = importRegex.exec(text)) !== null) {
            const importPath = match[1];
            
            try {
                // Resolver la ruta del archivo importado
                const basePath = path.dirname(document.fileName);
                let fullPath = '';

                if (importPath.startsWith('./') || importPath.startsWith('../')) {
                    // Ruta relativa
                    fullPath = path.resolve(basePath, importPath);
                } else {
                    // Podría ser un archivo en el mismo directorio
                    fullPath = path.join(basePath, importPath);
                }

                // Asegurar extensión .css si no tiene
                if (!fullPath.endsWith('.css')) {
                    fullPath += '.css';
                }

                console.log(`Intentando importar: ${fullPath}`);

                // Verificar si el archivo existe
                try {
                    const uri = vscode.Uri.file(fullPath);
                    await vscode.workspace.fs.stat(uri);
                    
                    // Abrir y procesar el documento importado
                    const importDoc = await vscode.workspace.openTextDocument(uri);
                    await this.processFile(importDoc);
                    
                } catch (error) {
                    console.log(`No se pudo encontrar el archivo: ${fullPath}`);
                }

            } catch (error) {
                console.error(`Error procesando import ${importPath}:`, error);
            }
        }
    }
}