import prompts from "prompts";
import Github from "./helpers/github.js";
console.clear();

await Github.IssueHistory({
    user: "pawtals",
});
