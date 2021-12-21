import crypto from "crypto";
import { ActionFunction, json } from "remix";
import { addPushJob } from "~/jobs/push_job.server";

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
    const branch = payload.ref.replace("refs/heads/", "");
    response.branch = branch;
    response.pusher = payload.pusher.name;
    await addPushJob({
      branch,
      cloneUrl: payload.repository.clone_url,
    });
  }
  return json(response, 200);
};
