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
        // Avoid processing the same file multiple times
        if (this.processedFiles.has(document.fileName)) {
            return;
        }
        this.processedFiles.add(document.fileName);

        const text = document.getText();

        // Look for color definitions in this file
        this.parseColorDefinitions(text);

        // Search for and process imports
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
                // Resolve the path of the imported file
                const basePath = path.dirname(document.fileName);
                let fullPath = '';

                if (importPath.startsWith('./') || importPath.startsWith('../')) {
                    // Relative path
                    fullPath = path.resolve(basePath, importPath);
                } else {
                    // It could be a file in the same directory
                    fullPath = path.join(basePath, importPath);
                }

                // Ensure .css extension if it doesn't have one
                if (!fullPath.endsWith('.css')) {
                    fullPath += '.css';
                }

                console.log(`Intentando importar: ${fullPath}`);

                // Check if the file exists
                try {
                    const uri = vscode.Uri.file(fullPath);
                    await vscode.workspace.fs.stat(uri);
                    
                    // Open and process the imported document
                    const importDoc = await vscode.workspace.openTextDocument(uri);
                    await this.processFile(importDoc);
                    
                } catch (error) {
                    console.log(`The file could not be found: ${fullPath}`);
                }

            } catch (error) {
                console.error(`Error processing import ${importPath}:`, error);
            }
        }
    }
}