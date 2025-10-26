import MarkdownIt from "markdown-it";

class Markdown {
    private markdown: MarkdownIt;
    private mainString: string;
    constructor() {
        this.mainString = "";
        this.markdown = new MarkdownIt({
            html: true // Enable HTML tags in source
        });
    }

    public AddLine(line: string) {
        this.mainString += line + "  \n";
        return;
    }

    public Render(): string {
        return this.markdown.render(this.mainString);
    }

    get MarkdownString(): string {
        return this.mainString;
    }
}

export default Markdown;
