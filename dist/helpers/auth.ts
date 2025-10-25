import { firefox, type BrowserContext, type Page, type Response } from "playwright";
import { access, mkdir, readFile, writeFile } from "fs/promises";
import { join } from "path";

const sessionsDir = join(process.cwd(), 'sessions');

class AuthPopup {
    private session: BrowserContext | undefined;
    constructor() {
        this.session;
    }

    public async Initalize() {
        this.session = await (await firefox.launch({ headless: false })).newContext();
        const page = await this.session.newPage();
        await page.goto("https://spacehey.com/login?return=http%3A%2F%2Fspacehey.com%2Fhome");

        const responseHandler = (response: Response) => {
            if (!response.url().includes("spacehey.com/home")) return;
            if (response.status() === 200) {
                page.removeListener("response", responseHandler);
                this.ScrapeAuthorization(page);
            };
        };

        page.addListener("response", responseHandler);
    }

    private async ScrapeAuthorization(page: Page) {
        if (!this.session) throw new Error("Authorization scraping called when no session existed.");
        const cookies = await this.session.cookies();
        await this.session.close();

        const authorization = cookies
            .map(c => `${c.name}=${c.value}`)
            .join('; ');

        try {
            await access(sessionsDir + "/auth.txt"); // should error if project is new
            await writeFile(sessionsDir + "/auth.txt", authorization);
        } catch(e) {
            await mkdir('session', { recursive: true });
            await writeFile(sessionsDir + "/auth.txt", authorization);
        }
    }
}

export default AuthPopup;
