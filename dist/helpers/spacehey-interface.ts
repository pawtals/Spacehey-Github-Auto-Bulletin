import axios, { AxiosError } from "axios";
import { access, readFile } from "fs/promises";
import { join } from "path";
const sessionsDir = join(process.cwd(), 'session');

class Spacehey {
    private cookies: string | undefined;
    constructor() {
        this.cookies;
        if (!this.AuthCheck()) throw new Error("Cookies for account are either expired or don't exist.");
    }

    /**
     * Checks if a valid cookie exists & if it is attached to an account.
     * @returns `true` if authorization was found.
     */
    private async AuthCheck(): Promise<boolean> {
        try {
            await access(sessionsDir + "/auth.txt");
            this.cookies = (await readFile(sessionsDir + "/auth.txt")).toString();
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
