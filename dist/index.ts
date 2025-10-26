import prompts from "prompts";
import Github from "./helpers/github.js";
import Spacehey from "./helpers/spacehey-interface.js";
import AuthPopup from "./helpers/auth.js";
import Markdown from "./helpers/markdown.js";

const spacehey = await Spacehey.create();
const mdRenderer = new Markdown();

await Github.CommitHistory({
    user: "pawtals"
}).then(md => md.forEach((line) => mdRenderer.AddLine(line)))
await Github.IssueHistory({
    user: "pawtals"
}).then(md => md.forEach((line) => mdRenderer.AddLine(line)))
await Github.PullHistory({
    user: "pawtals"
}).then(md => md.forEach((line) => mdRenderer.AddLine(line)))

spacehey.PostBulletin({
    title: "testing default css",
    content: mdRenderer.Render(),
})
