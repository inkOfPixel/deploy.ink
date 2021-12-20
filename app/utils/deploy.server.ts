import child from "child_process";
import { promisify } from "util";

const exec = promisify(child.exec);

export async function checkIfBranchDeploymentFolderExists(branch: string) {
  const { stdout } = await exec(`ls ~/deployments`);
  const deployments = stdout.split(" ");
  return deployments.includes(branch);
}

export async function listDeployments() {
  const { stdout } = await exec(`ls ~/deployments`);
  return stdout.split(" ");
}

export async function createDeployment(branch: string, repoUrl: string) {
  await exec(`
    mkdir ~/deployments/${branch};
    cd ~/deployments/${branch};
    git clone ${repoUrl} .;
    docker compose up -d;
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
