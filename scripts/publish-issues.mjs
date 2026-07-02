import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repo = "jon-gingrich/chinese-rummy";
const issueDir = path.join(__dirname, "..", "docs", "issues");

const cred = execSync("git credential fill", {
  input: "protocol=https\nhost=github.com\n\n",
  encoding: "utf8",
});
const tokenMatch = cred.match(/^password=(.+)$/m);
if (!tokenMatch) throw new Error("No GitHub token from git credential");
const token = tokenMatch[1].trim();

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
  "Content-Type": "application/json",
};

async function ghFetch(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status} ${url}: ${text}`);
  }
  return res.json();
}

await ghFetch(`https://api.github.com/repos/${repo}/labels`, {
  method: "POST",
  body: JSON.stringify({
    name: "ready-for-agent",
    color: "0E8A16",
    description: "Ready for AFK agent implementation",
  }),
}).catch((err) => {
  if (!String(err.message).includes("422")) throw err;
});

const files = fs
  .readdirSync(issueDir)
  .filter((f) => f.endsWith(".md"))
  .sort();

const created = {};

for (const file of files) {
  const content = fs.readFileSync(path.join(issueDir, file), "utf8");
  const match = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/);
  if (!match) throw new Error(`Invalid format: ${file}`);

  const title = match[1].match(/^title:\s*"(.*)"\s*$/m)?.[1];
  if (!title) throw new Error(`Missing title: ${file}`);

  let body = match[2].trim();
  for (const [sliceNum, issueNum] of Object.entries(created)) {
    body = body.replace(new RegExp(`#${sliceNum}\\b`, "g"), `#${issueNum}`);
  }

  const result = await ghFetch(`https://api.github.com/repos/${repo}/issues`, {
    method: "POST",
    body: JSON.stringify({ title, body, labels: ["ready-for-agent"] }),
  });

  const sliceNum = parseInt(file.replace(/\D/g, ""), 10);
  created[sliceNum] = result.number;
  console.log(`${file} -> #${result.number} ${result.html_url}`);
}
