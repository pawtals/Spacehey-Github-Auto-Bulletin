import { readdir, readFile } from "fs/promises";
import { join, extname, basename } from "path";

/**
 * Template parser for markdown files that supports template variables
 * like {{randquote}} and {{randimg}}
 */
class TemplateParser {
    private staticPath: string;
    private readonly imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'];

    constructor() {
        this.staticPath = join(process.cwd(), 'static');
    }

    private isImageFile(filename: string): boolean {
        const ext = extname(filename).toLowerCase();
        return this.imageExtensions.includes(ext);
    }

    /**
     * Gets a random text file from a directory
     * @param directory - Directory path relative to static folder
     * @returns Content of a random text file or empty string if directory is empty
     */
    private async getRandomTextFile(directory: string): Promise<string> {
        const dirPath = join(this.staticPath, directory);

        try {
            const files = await readdir(dirPath);

            // Filter out hidden files and directories
            const validFiles = files.filter(file => !file.startsWith('.'));

            if (validFiles.length === 0) {
                console.log(`No files found in ${directory}`);
                return "";
            }

            const randomIndex = Math.floor(Math.random() * validFiles.length);
            const randomFile = validFiles[randomIndex];

            if (!randomFile) {
                console.log(`No valid file selected from ${directory}`);
                return "";
            }

            const filePath = join(dirPath, randomFile);

            const content = await readFile(filePath, { encoding: 'utf-8' });
            return content.trim();
        } catch (error) {
            console.error(`Error reading from ${directory}:`, error);
            return "";
        }
    }

    /**
     * Gets a random image file from a directory and returns markdown image syntax
     * The path will be relative to static/ so imgbb helper can process it
     * @param directory - Directory path relative to static folder
     * @returns Markdown image syntax or empty string if no images found
     */
    private async getRandomImageFile(directory: string): Promise<string> {
        const dirPath = join(this.staticPath, directory);

        try {
            const files = await readdir(dirPath);

            // Filter out hidden files and only include actual image files
            const validFiles = files.filter(file =>
                !file.startsWith('.') && this.isImageFile(file)
            );

            if (validFiles.length === 0) {
                console.log(`No image files found in ${directory}`);
                return "";
            }

            const randomIndex = Math.floor(Math.random() * validFiles.length);
            const randomFile = validFiles[randomIndex];

            if (!randomFile) {
                console.log(`No valid image selected from ${directory}`);
                return "";
            }

            // Generate markdown
            const relativePath = join('static', directory, randomFile);
            const altText = basename(randomFile, extname(randomFile));

            return `![${altText}](${relativePath})`;
        } catch (error) {
            console.error(`Error reading from ${directory}:`, error);
            return "";
        }
    }

    /**
     * Parses markdown content and replaces template variables
     * Supported variables:
     * - {{randquote}} - Random text from static/text directory
     * - {{randimg}} - Random image markdown from static/images directory (actual image files)
     *
     * @param content - Markdown content with template variables
     * @returns Parsed content with variables replaced
     */
    public async parse(content: string): Promise<string> {
        let parsed = content;

        if (parsed.includes('{{randquote}}')) {
            const randomQuote = await this.getRandomTextFile('text');
            parsed = parsed.replace(/\{\{randquote\}\}/g, randomQuote);
        }

        if (parsed.includes('{{randimg}}')) {
            const randomImg = await this.getRandomImageFile('images');
            parsed = parsed.replace(/\{\{randimg\}\}/g, randomImg);
        }

        return parsed;
    }

    public async parseAll(content: string): Promise<string> {
        return await this.parse(content);
    }
}

export default TemplateParser;
