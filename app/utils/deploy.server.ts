import child from "child_process";
import getPort from "get-port";
import { promisify } from "util";

const exec = promisify(child.exec);

export async function listDeployments() {
  const { stdout } = await exec(`ls ~/deployments`);
  const dedupedWhitespaceOutput = stdout.replace(/(\s+)/g, " ");
  const folders = dedupedWhitespaceOutput
    .split(" ")
    .map((f) => f.trim())
    .filter((f) => f.length > 0);
  console.log("RES", folders);
  return folders;
}

export interface CreateDeploymentOptions {
  branch: string;
  cloneUrl: string;
  baseFolder?: string;
}

export async function createDeployment({
  branch,
  cloneUrl,
  baseFolder = "",
}: CreateDeploymentOptions) {
  const port = await getPort();
  const normalizedFolder = normalizeFolderName(baseFolder);
  await exec(`
    mkdir ~/deployments/${branch};
    cd ~/deployments/${branch};
    git clone ${cloneUrl} .;
    ${normalizedFolder.length > 0 ? `cd ${normalizedFolder};` : ""}
    echo "HOST_PORT=${port}" >> .env;
    docker compose up -d;
    curl localhost:2019/config/apps/http/servers/dashboard/routes -X POST -H "Content-Type: application/json" -d '{ "handle": [ { "handler": "reverse_proxy", "transport": { "protocol": "http" }, "upstreams": [ { "dial": "localhost:${port}" } ] } ], "match": [ { "host": [ "${branch}.deploy.ink" ] } ] }'
  `);
}

export interface RedeployOptions {
  branch: string;
  baseFolder?: string;
}

export async function redeploy({ branch, baseFolder = "" }: RedeployOptions) {
  const normalizedFolder = normalizeFolderName(baseFolder);
  await exec(`
    cd ~/deployments/${branch};
    git pull;
    ${normalizedFolder.length > 0 ? `cd ${normalizedFolder};` : ""}
    docker compose build;
    docker compose up --no-deps -d;
  `);
}

function normalizeFolderName(folder: string) {
  return folder.replace(/\/$/g, "").replace(/^\//g, "");
}

function listActiveContainers() {
  return exec(
    `docker ps --format '{"id":"{{ .ID }}", "image": "{{ .Image }}", "name":"{{ .Names }}"}'`
  );
}
