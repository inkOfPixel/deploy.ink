import { ActionFunction, json } from "remix";
import crypto from "crypto";

export const action: ActionFunction = async ({ request }) => {
  const GITHUB_WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;
  if (request.method !== "POST") {
    return json({ message: "Method not allowed" }, 405);
  }
  if (!GITHUB_WEBHOOK_SECRET) {
    return json({ message: "GITHUB_WEBHOOK_SECRET not set" }, 500);
  }
  console.log("GITHUB_WEBHOOK_SECRET", GITHUB_WEBHOOK_SECRET);
  console.log("🪝 GITHUB WEBHOOK");
  const signature = request.headers.get("X-Hub-Signature");
  console.log("🪝 signature", signature);
  const generatedSignature = `sha1=${crypto
    .createHmac("sha1", GITHUB_WEBHOOK_SECRET)
    .update(JSON.stringify(request.body))
    .digest("hex")}`;
  console.log("🪝 generatedSignature", generatedSignature);

  if (signature !== generatedSignature) {
    return json({ message: "Signature mismatch" }, 401);
  }
  const payload = await request.json();
  const event = request.headers.get("X-GitHub-Event");
  const response: any = {
    message: `Webhook received: ${event}`,
    event,
  };
  if (event === "push") {
    response.branch = payload.ref.replace("refs/heads/", "");
    response.pusher = payload.pusher.name;
  }
  return json(response, 200);
};
