import MarkdownIt from "markdown-it";
import { readFile, access } from "fs/promises";
import { join } from "path";
import TemplateParser from "./template-parser.js";
import ImgbbHelper from "./imgbb/index.js";

class Markdown {
    private markdown: MarkdownIt;
    private mainString: string;
    private headerString: string;
    private footerString: string;
    private templateParser: TemplateParser;
    private processedContent: string | null;

    constructor() {
        this.mainString = "";
        this.headerString = "";
        this.footerString = "";
        this.processedContent = null;
        this.markdown = new MarkdownIt({
            html: true // Enable HTML tags in source
        });
        this.templateParser = new TemplateParser();
    }

    /**
     * Loads header markdown from static/header.md if it exists
     * Parses template variables like {{randquote}} and {{randimg}}
     */
    public async LoadHeader(): Promise<void> {
        const headerPath = join(process.cwd(), 'static', 'header.md');
        try {
            await access(headerPath);
            const rawContent = (await readFile(headerPath)).toString();
            this.headerString = await this.templateParser.parse(rawContent);
        } catch (e) {
            console.log("header file doesn't exist skipping...");
        }
    }

    /**
     * Loads footer markdown from static/footer.md if it exists
     * Parses template variables like {{randquote}} and {{randimg}}
     */
    public async LoadFooter(): Promise<void> {
        const footerPath = join(process.cwd(), 'static', 'footer.md');
        try {
            await access(footerPath);
            const rawContent = (await readFile(footerPath)).toString();
            this.footerString = await this.templateParser.parse(rawContent);
        } catch (e) {
            console.log("footer file doesn't exist skipping...");
        }
    }

    public AddLine(line: string) {
        this.mainString += line + "  \n";
        return;
    }

    /**
     * Processes all images in the markdown content through imgbb
     * Uploads local images and replaces paths with hosted URLs
     * @param imgbbHelper - Instance of ImgbbHelper with API key
     */
    public async ProcessImages(imgbbHelper: ImgbbHelper): Promise<void> {
        // Get the full markdown content before rendering
        const fullContent = this.headerString + "\n\n" + this.mainString + "\n\n" + this.footerString;

        // Process all images through imgbb
        const result = await imgbbHelper.ProcessMarkdown(fullContent);

        // Store the processed content with hosted URLs
        this.processedContent = result.updatedMarkdown;

        console.log(`✓ Processed ${result.uploadedImages.length} images`);
    }

    public Render(): string {
        // Use processed content if available, otherwise use original
        const fullContent = this.processedContent ||
            (this.headerString + "\n\n" + this.mainString + "\n\n" + this.footerString);
        return this.markdown.render(fullContent);
    }

    get MarkdownString(): string {
        return this.mainString;
    }
}

export default Markdown;
