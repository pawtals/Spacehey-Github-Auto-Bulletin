import { access, writeFile, readFile } from "fs/promises";
import { join, extname, isAbsolute, basename } from "path";
import { uploadImage as imgbbUpload } from "./uploader.js";
import prompts from "prompts";

interface ImageUploadResult {
    originalPath: string;
    hostedUrl: string;
    alt: string;
}

class ImgbbHelper {
    private apiKey: string;
    private readonly imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'];
    private static readonly SESSION_FILE = join(process.cwd(), 'session', 'imgbb.txt');

    constructor(apiKey: string) {
        this.apiKey = apiKey;
    }

    /**
     * Prompts user for imgbb API key and saves it to session/imgbb.txt
     * @returns The API key entered by the user
     */
    public static async PromptForApiKey(): Promise<string> {
        const response = await prompts({
            type: 'text',
            name: 'apiKey',
            message: 'Enter your imgbb API key:',
            validate: (value: string) => value.length > 0 ? true : 'API key cannot be empty'
        });

        if (!response.apiKey) {
            throw new Error('API key is required');
        }

        // Save to session file
        await writeFile(this.SESSION_FILE, response.apiKey, 'utf-8');
        console.log(`✓ API key saved to ${this.SESSION_FILE}`);

        return response.apiKey;
    }

    /**
     * Reads the API key from session/imgbb.txt
     * @returns The API key or null if file doesn't exist
     */
    public static async GetSavedApiKey(): Promise<string | null> {
        try {
            await access(this.SESSION_FILE);
            const apiKey = await readFile(this.SESSION_FILE, 'utf-8');
            return apiKey.trim();
        } catch (e) {
            return null;
        }
    }

    /**
     * Clears the saved API key
     */
    public static async ClearApiKey(): Promise<void> {
        try {
            await access(this.SESSION_FILE);
            await writeFile(this.SESSION_FILE, '', 'utf-8');
            console.log('✓ Cleared saved API key');
        } catch (e) {
            // File doesn't exist, nothing to clear
        }
    }

    /**
     * Gets API key from session file or prompts user if not found
     * @param forcePrompt - If true, always prompts for new key
     * @returns The API key
     */
    public static async GetOrPromptApiKey(forcePrompt: boolean = false): Promise<string> {
        if (!forcePrompt) {
            const savedKey = await this.GetSavedApiKey();

            if (savedKey) {
                console.log('✓ Using saved imgbb API key');
                return savedKey;
            }
        }

        console.log('No saved API key found');
        return await this.PromptForApiKey();
    }

    /**
     * Checks if a file path points to an image based on extension
     */
    private isImageFile(filePath: string): boolean {
        const ext = extname(filePath).toLowerCase();
        return this.imageExtensions.includes(ext);
    }

    /**
     * Resolves relative paths to absolute paths based on the current working directory
     */
    private resolvePath(filePath: string): string {
        if (isAbsolute(filePath)) {
            return filePath;
        }
        return join(process.cwd(), filePath);
    }

    /**
     * Uploads a single image to imgbb
     */
    private async uploadImage(filePath: string): Promise<string> {
        const absolutePath = this.resolvePath(filePath);

        try {
            await access(absolutePath);
        } catch (e) {
            throw new Error(`Image file not found: ${absolutePath}`);
        }

        try {
            const response = await imgbbUpload({
                apiKey: this.apiKey,
                imagePath: absolutePath,
                name: basename(filePath, extname(filePath))
            });
            return response.data.url;
        } catch (e: any) {
            throw new Error(`Failed to upload image ${filePath}: ${e.message}`);
        }
    }

    /**
     * Parses markdown content and finds all image references
     * Returns array of matches with their details
     */
    private parseMarkdownImages(markdown: string): Array<{ match: string; alt: string; path: string }> {
        // find ![alt](path)
        const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
        const images: Array<{ match: string; alt: string; path: string }> = [];

        let match;
        while ((match = imageRegex.exec(markdown)) !== null) {
            if (match[0] && match[1] !== undefined && match[2]) {
                images.push({
                    match: match[0],
                    alt: match[1],
                    path: match[2]
                });
            }
        }

        return images;
    }

    /**
     * Uploads all images in a markdown file to imgbb and returns the urls and updated markdown
     */
    public async ProcessMarkdown(markdown: string): Promise<{
        updatedMarkdown: string;
        uploadedImages: ImageUploadResult[]
    }> {
        const images = this.parseMarkdownImages(markdown);
        const uploadedImages: ImageUploadResult[] = [];
        let updatedMarkdown = markdown;

        for (const image of images) {
            // Skip if it's already a URL (http/https)
            if (image.path.startsWith('http://') || image.path.startsWith('https://')) {
                console.log(`Skipping already hosted image: ${image.path}`);
                continue;
            }

            // Check if it's an image file
            if (!this.isImageFile(image.path)) {
                console.log(`Skipping non-image file: ${image.path}`);
                continue;
            }

            try {
                console.log(`Uploading ${image.path}...`);
                const hostedUrl = await this.uploadImage(image.path);

                // Replace the old markdown image with the new hosted URL
                const newImageMarkdown = `![${image.alt}](${hostedUrl})`;
                updatedMarkdown = updatedMarkdown.replace(image.match, newImageMarkdown);

                uploadedImages.push({
                    originalPath: image.path,
                    hostedUrl: hostedUrl,
                    alt: image.alt
                });

                console.log(`✓ Uploaded: ${image.path} -> ${hostedUrl}`);
            } catch (e: any) {
                console.error(`✗ Failed to upload ${image.path}: ${e.message}`);
            }
        }

        return {
            updatedMarkdown,
            uploadedImages
        };
    }

    /**
     * Returns array of hosted URLs for uploaded images
     */
    public async GetUploadedUrls(markdown: string): Promise<string[]> {
        const result = await this.ProcessMarkdown(markdown);
        return result.uploadedImages.map(img => img.hostedUrl);
    }
}

export default ImgbbHelper;
