import prompts from "prompts";
import Github from "./helpers/github.js";
console.clear();

console.log(await Github.PullHistory({
    user: "pawtals",
}))
