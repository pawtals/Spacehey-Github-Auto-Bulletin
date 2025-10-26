import { access } from "fs/promises";
import { join, extname, isAbsolute, basename } from "path";
import { uploadImage as imgbbUpload } from "./uploader.js";

interface ImageUploadResult {
    originalPath: string;
    hostedUrl: string;
    alt: string;
}

class ImgbbHelper {
    private apiKey: string;
    private readonly imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp', '.svg'];

    constructor(apiKey: string) {
        this.apiKey = apiKey;
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
