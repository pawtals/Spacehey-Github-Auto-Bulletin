import prompts from "prompts";
import Github from "./helpers/github.js";
import Spacehey from "./helpers/spacehey-interface.js";
import AuthPopup from "./helpers/auth.js";
import Markdown from "./helpers/markdown.js";
import ImgbbHelper from "./helpers/imgbb/index.js";

const spacehey = await Spacehey.create();
const mdRenderer = new Markdown();

// Load header and footer
await mdRenderer.LoadHeader();
await mdRenderer.LoadFooter();

await Github.CommitHistory({
    user: "pawtals"
}).then(md => md.forEach((line) => mdRenderer.AddLine(line)))
await Github.IssueHistory({
    user: "pawtals"
}).then(md => md.forEach((line) => mdRenderer.AddLine(line)))
await Github.PullHistory({
    user: "pawtals"
}).then(md => md.forEach((line) => mdRenderer.AddLine(line)))

// Process images through imgbb before rendering
try {
    let apiKey = await ImgbbHelper.GetOrPromptApiKey();
    let imgbbHelper = new ImgbbHelper(apiKey);

    try {
        await mdRenderer.ProcessImages(imgbbHelper);
    } catch (error: any) {
        // Check if it's an API key error
        if (error.message && error.message.includes('Invalid API')) {
            console.error('✗ Invalid imgbb API key detected');

            // Ask if user wants to enter a new key
            const response = await prompts({
                type: 'confirm',
                name: 'retry',
                message: 'Would you like to enter a new API key?',
                initial: true
            });

            if (response.retry) {
                // Clear the old key and prompt for new one
                await ImgbbHelper.ClearApiKey();
                apiKey = await ImgbbHelper.GetOrPromptApiKey(true);
                imgbbHelper = new ImgbbHelper(apiKey);
                await mdRenderer.ProcessImages(imgbbHelper);
            } else {
                console.log("Continuing without image upload");
            }
        } else {
            throw error;
        }
    }
} catch (error) {
    console.error("Error processing images:", error);
    console.log("Continuing without image upload");
}

spacehey.PostBulletin({
    title: "footer",
    content: mdRenderer.Render(),
})
