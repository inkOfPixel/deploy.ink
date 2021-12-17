import { ActionFunction, json } from "remix";
import crypto from "crypto";
import { promisify } from "util";
import child from "child_process";

const exec = promisify(child.exec);

export const action: ActionFunction = async ({ request }) => {
  if (request.method !== "POST") {
    return json({ message: "Method not allowed" }, 405);
  }
  const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
  if (!GITHUB_WEBHOOK_SECRET) {
    return json({ message: "GITHUB_WEBHOOK_SECRET not set" }, 500);
  }
  const payload = await request.json();
  const signature = request.headers.get("X-Hub-Signature");
  const generatedSignature = `sha1=${crypto
    .createHmac("sha1", GITHUB_WEBHOOK_SECRET)
    .update(JSON.stringify(payload))
    .digest("hex")}`;
  if (signature !== generatedSignature) {
    return json({ message: "Signature mismatch" }, 401);
  }
  const event = request.headers.get("X-GitHub-Event");
  const response: any = {
    message: `Webhook received: ${event}`,
    event,
  };
  if (event === "push") {
    response.branch = payload.ref.replace("refs/heads/", "");
    response.pusher = payload.pusher.name;
    const { stdout } = await exec(
      `docker ps --format '{"id":"{{ .ID }}", "image": "{{ .Image }}", "name":"{{ .Names }}"}'`
    );
    response.dir = stdout;
  }
  return json(response, 200);
};