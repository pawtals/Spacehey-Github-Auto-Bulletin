import MarkdownIt from "markdown-it";
import { readFile, access } from "fs/promises";
import { join } from "path";

class Markdown {
    private markdown: MarkdownIt;
    private mainString: string;
    private headerString: string;
    private footerString: string;

    constructor() {
        this.mainString = "";
        this.headerString = "";
        this.footerString = "";
        this.markdown = new MarkdownIt({
            html: true // Enable HTML tags in source
        });
    }

    /**
     * Loads header markdown from static/header.md if it exists
     */
    public async LoadHeader(): Promise<void> {
        const headerPath = join(process.cwd(), 'static', 'header.md');
        try {
            await access(headerPath);
            this.headerString = (await readFile(headerPath)).toString();
        } catch (e) {
            console.log("header file doesn't exist skipping...");
        }
    }

    /**
     * Loads footer markdown from static/footer.md if it exists
     */
    public async LoadFooter(): Promise<void> {
        const footerPath = join(process.cwd(), 'static', 'footer.md');
        try {
            await access(footerPath);
            this.footerString = (await readFile(footerPath)).toString();
        } catch (e) {
            console.log("footer file doesn't exist skipping...");
        }
    }

    public AddLine(line: string) {
        this.mainString += line + "  \n";
        return;
    }

    public Render(): string {
        const fullContent = this.headerString + "\n\n" + this.mainString + "\n\n" + this.footerString;
        return this.markdown.render(fullContent);
    }

    get MarkdownString(): string {
        return this.mainString;
    }
}

export default Markdown;
