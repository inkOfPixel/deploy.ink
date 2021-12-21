import child from "child_process";
import getPort from "get-port";
import { promisify } from "util";

const exec = promisify(child.exec);

export async function checkIfBranchDeploymentFolderExists(branch: string) {
  const { stdout } = await exec(`ls ~/deployments`);
  const deployments = stdout.split(" ");
  return deployments.includes(branch);
}

export async function listDeployments() {
  const { stdout } = await exec(`ls ~/deployments`);
  return stdout.trim().length > 0 ? stdout.split(" ") : [];
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
  console.log("!! Got port", port);
  const strippedFolder = baseFolder.replace(/\/$/g, "").replace(/^\//g, "");
  await exec(`
    mkdir ~/deployments/${branch};
    cd ~/deployments/${branch};
    git clone ${cloneUrl} .;
    ${strippedFolder.length > 0 ? `cd ${strippedFolder};` : ""};
    echo "HOST_PORT=${port}" >> .env;
    docker compose up -d;
    curl localhost:2019/config/apps/http/servers/dashboard/routes -X POST -H "Content-Type: application/json" -d '{ "handle": [ { "handler": "reverse_proxy", "transport": { "protocol": "http" }, "upstreams": [ { "dial": "localhost:${port}" } ] } ], "match": [ { "host": [ "${branch}.deploy.ink" ] } ] }'
  `);
}

export async function redeploy(branch: string) {
  await exec(`
    cd ~/deployments/${branch};
    docker compose down;
    docker compose build strapi-${branch};
    docker compose up --no-deps -d strapi-${branch};
  `);
}

function listActiveContainers() {
  return exec(
    `docker ps --format '{"id":"{{ .ID }}", "image": "{{ .Image }}", "name":"{{ .Names }}"}'`
  );
}
