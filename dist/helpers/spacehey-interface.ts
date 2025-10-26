import axios, { AxiosError } from "axios";
import { access, readFile } from "fs/promises";
import { join } from "path";
const sessionsDir = join(process.cwd(), 'session');

class Spacehey {
    private cookies: string | undefined;
    private constructor() {
        this.cookies;
    }

    static async create() {
        const instance = new Spacehey();
        const isAuthed = await instance.AuthCheck();
        if (!isAuthed) throw new Error("Cookies for account are either expired or don't exist.");
        return instance;
    }

    /**
     * Posts form data to https://spacehey.com/createbulletin as a logged in user.
     */
    public async PostBulletin({ title, content, duration, comments, cssref }: {title: string, content: string, duration: "1d" | "5d" | "10d", comments: "enabled" | "disabled", cssref: string | undefined}) {
        if (cssref) content = content.concat(`<style>@import url("${cssref}")</style>`) // todo move to my server's static files
        else content = content.concat(`<style>@import url("")</style>`);
        const formData = new URLSearchParams({
            subject: title,
            content: content,
            duration: duration,
            comments: comments,
            submit: ''
        });

        try {
            const response = await axios.post('https://spacehey.com/createbulletin', formData.toString(), {
                headers: {
                    'Cookie': this.cookies,
                    'Content-Type': 'application/x-www-form-urlencoded'
                },
                maxRedirects: 0,
                validateStatus: (status) => status < 400
            });
            return response.data;
        } catch(e: any) {
            if (e.response) {
                if (e.response.status === 302) {
                    const redirectUrl = e.response.headers.location || 'No location header found';
                    console.log(`302 Redirect detected. Redirection URL: ${redirectUrl}`);
                }
                throw new Error(`failed to post bulletin: ${e.response.status} - ${e.response.statusText}`);
            }
            throw new Error(`failed to post bulletin: ${e.message}`);
        }
    }

    /**
     * Checks if a valid cookie exists & if it is attached to an account.
     * @returns `true` if authorization was found.
     */
    private async AuthCheck(): Promise<boolean> {
        try {
            await access(sessionsDir + "/auth.txt");
            this.cookies = (await readFile(sessionsDir + "/auth.txt")).toString().trim();
        } catch(e) {
            console.error("headers for axios do not exist, please login")
            return false;
        }
        try {
            const bulletinCheck = await axios.get("https://spacehey.com/createbulletin", {
                maxRedirects: 0,
                headers: {
                    'Cookie': this.cookies
                }
            });
            if (bulletinCheck.status !== 200) throw new Error("Unhandled status, check for server issues with https://spacehey.com")
        } catch(e: any) {
            if (e.response && e.response.status === 302) throw new Error("302 redirect unauthorized, please check your authorization.");
            else throw new Error("Unhandled response:", e)
        }
        return true;
    }
}

export default Spacehey;
