import axios from "axios";
import { join } from "path";
const sessionsDir = join(process.cwd(), 'sessions');

/**
 * Spinner utility for loading indicators
 */
class Spinner {
    private frames = ['|', '/', '-', '\\'];
    private currentFrame = 0;
    private interval: NodeJS.Timeout | null = null;
    private message: string;

    constructor(message: string) {
        this.message = message;
    }

    start(): void {
        process.stdout.write('\x1B[?25l'); // Hide cursor
        this.interval = setInterval(() => {
            process.stdout.write(`\r${this.frames[this.currentFrame]} ${this.message}`);
            this.currentFrame = (this.currentFrame + 1) % this.frames.length;
        }, 75);
    }

    stop(finalMessage?: string): void {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
        process.stdout.write('\r\x1B[K'); // Clear line
        if (finalMessage) {
            console.log(finalMessage);
        }
        process.stdout.write('\x1B[?25h'); // Show cursor
    }
}

/**
 * wrapper to execute async functions with a spinner
 */
async function withSpinner<T>(message: string, fn: () => Promise<T>): Promise<T> {
    const spinner = new Spinner(message);
    spinner.start();
    try {
        const result = await fn();
        spinner.stop(`(✓) ${message} - Done`);
        return result;
    } catch (error) {
        spinner.stop(`(X) ${message} - Failed`);
        throw error;
    }
}

/**
 * Functions to get Github API data.
 */
class Github {
    static async CommitHistory({ user, per_page, max }: { user: string; per_page?: number, max?: number }): Promise<Array<string>>  {
        return withSpinner(`Fetching commit history for ${user}`, async () => {
            if (!per_page) per_page = 20;
            if (!max) max = 3;
            const query = (await axios.get(`https://api.github.com/search/commits?q=author:${user} sort:committer-date&per_page=${per_page}&order=desc`)).data.items;
            const mdChunks: Array<string> = [`## ${sanitizeString(query[0].commit.author.name)}'s recent commits`];
            let commitsAdded = 0;
            for (let i in query) {
                const item = query[i];
                if (commitsAdded >= max || !DateCheck(item.commit.author.date)) break;
                mdChunks.push('<div class="gab-commit">');
                let md = `### \`${sanitizeString(item.commit.message)}\` at \`${sanitizeString(item.repository.full_name)}\``;
                mdChunks.push(md);
                const [d, t] = ToSplitTime(new Date(item.commit.author.date));
                mdChunks.push(`Committed \`${d} at ${t} UTC\` [\`SHA: ${item.sha}\`](${item.html_url})`);
                mdChunks.push('</div>')
                commitsAdded++;
            }
            if (commitsAdded === 0) mdChunks[0] = "";
            return mdChunks;
        });
    }

    static async IssueHistory({ user, per_page, max }: { user: string; per_page?: number, max?: number }): Promise<Array<string>>  {
        return withSpinner(`Fetching issue history for ${user}`, async () => {
            if (!per_page) per_page = 20;
            if (!max) max = 3;
            const query = (await axios.get(`https://api.github.com/search/issues?q=author:${user} is:issue sort:created&per_page=${per_page}&order=desc`)).data.items;
            const name = (await axios.get(query[0].user.url)).data.name;
            const mdChunks: Array<string> = [`## ${name}'s recent issues`];
            let issuesAdded = 0;
            for (let i in query) {
                const item = query[i];
                if (issuesAdded >= max || !DateCheck(item.updated_at)) break;
                const repo_name = (await axios.get(query[0].repository_url)).data.full_name;
                mdChunks.push('<div class="gab-commit">');
                let md = `### ${item.author_association} ${name} at \`${repo_name}\``;
                mdChunks.push(md);
                {
                    const [d, t] = ToSplitTime(new Date(item.updated_at));
                    mdChunks.push(`Issue updated \`${d} at ${t} UTC\` [\`ID: ${item.id}\`](${item.html_url})`);
                }
                {
                    const [d, t] = ToSplitTime(new Date(item.updated_at));
                    mdChunks.push(`#### ${item.title} | Created at: \`${d} at ${t} UTC\``);
                }
                if (item.body != null) mdChunks.push(`${item.body}`);
                mdChunks.push(`<div class="gab-issue-status">${item.state}</div>`);
                mdChunks.push(`Comments: \`${item.comments}\``);
                mdChunks.push('</div>')
                issuesAdded++;
            }
            return mdChunks;
        });
    }

    static async PullHistory({ user, per_page, max }: { user: string; per_page?: number, max?: number }): Promise<Array<string>>  {
        return withSpinner(`Fetching issue history for ${user}`, async () => {
            if (!per_page) per_page = 20;
            if (!max) max = 3;
            const query = (await axios.get(`https://api.github.com/search/issues?q=author:${user} is:pr sort:created&per_page=${per_page}&order=desc`)).data.items;
            const name = (await axios.get(query[0].user.url)).data.name;
            const mdChunks: Array<string> = [`## ${name}'s recent pull requests`];
            let issuesAdded = 0;
            for (let i in query) {
                const item = query[i];
                if (issuesAdded >= max || !DateCheck(item.updated_at)) break;
                const repo_name = (await axios.get(query[0].repository_url)).data.full_name;
                let md = `### ${item.author_association} ${name} at \`${repo_name}\``;
                mdChunks.push('<div class="gab-commit">');
                mdChunks.push(md);
                {
                    const [d, t] = ToSplitTime(new Date(item.updated_at));
                    mdChunks.push(`Issue updated \`${d} at ${t} UTC\` [\`ID: ${item.id}\`](${item.html_url})`);
                }
                {
                    const [d, t] = ToSplitTime(new Date(item.updated_at));
                    mdChunks.push(`#### ${item.title} | Created at: \`${d} at ${t} UTC\``);
                }
                if (item.body != null) mdChunks.push(`${item.body}`);
                mdChunks.push(`<div class="gab-issue-status">${item.state}</div>`);
                mdChunks.push(`Comments: \`${item.comments}\``);
                mdChunks.push('</div>')
                issuesAdded++;
            }
            return mdChunks;
        });
    }
}

/**
 * sanitizes strings to prevent markdown injection
 */
function sanitizeString(str: string): string {
    return str
        .replace(/\r\n/g, ' ')
        .replace(/[\r\n]/g, ' ') // remove newlines
        .replace(/\0/g, '') // remove null bytes
        .replace(/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/g, '') // remove control charactes
        .replace(/\s+/g, ' ') // collapse spaces
        .trim();
}

function ToSplitTime(date: Date): [string, string] {
    let [d, t] = date.toISOString().split("T");
    if (!t || !d) throw new Error("date failed to split");
    t = t.slice(0, 8);
    return [d, t];
}

function DateCheck(ghDate: string): boolean {
    const commitDate = new Date(ghDate);
    let lastQuery: Date;

    try {
        const sessionData = require(sessionsDir + '/gh.json');
        lastQuery = new Date(sessionData.last_query);
    } catch {
        // default to 1 week ago if file doesn't exist or no last_query
        lastQuery = new Date();
        lastQuery.setDate(lastQuery.getDate() - 7);
    }

    return commitDate.valueOf() >= lastQuery.valueOf();
};

export default Github;
