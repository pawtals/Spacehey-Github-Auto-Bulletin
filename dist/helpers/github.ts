import axios from "axios";

/*
 * static methods to create markdown based on github api data
 * returns arrays to be iterated
*/
class Github {
    static async CommitHistory({ user, per_page, max }: { user: string; per_page?: number, max?: number }): Promise<Array<string>>  {
        if (!per_page) per_page = 10;
        if (!max) max = 3;
        const query = (await axios.get(`https://api.github.com/search/commits?q=author:${user}&per_page=${per_page}&order=%22desc%22&sort=%22author-date%22`)).data.items;
        const mdChunks: Array<string> = [`## ${query[0].commit.author.name}'s recent commits`];
        for (let i in query) {
            const item = query[i];
            if (mdChunks.length > (max * 2) + 1 || DateCheck(item.commit.date)) break;
            let md = `### ${item.commit.message} at ${item.repository.full_name}`;
            // if you want you can customize these to your liking
            mdChunks.push(`![profile picture](${item.author.avatar_url})`);
            // ^ profile picture
            mdChunks.push(md);
        }
        return mdChunks;
    }
}

function DateCheck(ghDate: string): boolean {
    const commitDate = new Date(ghDate);
    let lastQuery: Date;

    try {
        const sessionData = require('../../session/gh.json');
        lastQuery = new Date(sessionData.last_query);
    } catch {
        // default to 1 week ago if file doesn't exist or no last_query
        lastQuery = new Date();
        lastQuery.setDate(lastQuery.getDate() - 7);
    }

    return commitDate >= lastQuery;
};

export default Github;
