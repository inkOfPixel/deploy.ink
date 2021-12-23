import { Job } from "bullmq";
import child from "child_process";
import getPort from "get-port";
import { promisify } from "util";

const exec = promisify(child.exec);

const DEPLOYMENTS_DIRECTORY = "/home/ubuntu/deployments";

export interface DeploymentJobProgress {
  lines: string[];
}

export interface DeploymentParams {
  branch: string;
  cloneUrl: string;
  deployPath: string;
}

export async function listDeployments() {
  const { stdout } = await exec(`ls ~/deployments`);
  const dedupedWhitespaceOutput = stdout.replace(/(\s+)/g, " ");
  const folders = dedupedWhitespaceOutput
    .split(" ")
    .map((f) => f.trim())
    .filter((f) => f.length > 0);
  return folders;
}

export async function createDeployment({
  branch,
  cloneUrl,
  deployPath: baseFolder = "",
}: DeploymentParams) {
  const port = await getPort();
  const normalizedFolder = getRelativePath(baseFolder);
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

export async function redeploy(params: DeploymentParams, job: Job) {
  await appendLineToDeploymentProgress(job, "Pulling latest changes...");
  await pullLatestChanges(params, job);
  await appendLineToDeploymentProgress(job, "\n\nBuilding new image...");
  await buildNewImage(params, job);
  await appendLineToDeploymentProgress(job, "\n\nRestarting containers...");
  await restartContainers(params, job);
}

function pullLatestChanges(params: DeploymentParams, job: Job) {
  return new Promise((resolve, reject) => {
    const repoPath = getRepoPath(params);
    const command = child.spawn("git", ["pull"], {
      cwd: repoPath,
    });
    command.stdout.on("data", (data) => {
      appendLineToDeploymentProgress(job, data.toString()).catch(reject);
    });

    command.stderr.on("data", (data) => {
      appendLineToDeploymentProgress(job, "err: " + data.toString()).catch(
        reject
      );
    });

    command.on("close", (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(`Failed to pull changes: Exit code ${code}`);
      }
    });

    command.on("error", (err) => {
      reject(err);
    });
  });
}

function buildNewImage(params: DeploymentParams, job: Job) {
  return new Promise((resolve, reject) => {
    const deployPath = getRepoDeployPath(params);
    const command = child.spawn("docker", ["compose", "build", "--no-cache"], {
      cwd: deployPath,
    });
    command.stdout.on("data", (data) => {
      appendLineToDeploymentProgress(job, data.toString()).catch(reject);
    });

    command.stderr.on("data", (data) => {
      appendLineToDeploymentProgress(job, "err: " + data.toString()).catch(
        reject
      );
    });

    command.on("close", (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(`Failed to pull changes: Exit code ${code}`);
      }
    });

    command.on("error", (err) => {
      reject(err);
    });
  });
}

function restartContainers(params: DeploymentParams, job: Job) {
  return new Promise((resolve, reject) => {
    const command = child.spawn(
      "docker",
      ["compose", "up", "--no-deps", "-d"],
      {
        cwd: getRepoDeployPath(params),
      }
    );
    command.stdout.on("data", (data) => {
      appendLineToDeploymentProgress(job, data.toString()).catch(reject);
    });

    command.stderr.on("data", (data) => {
      appendLineToDeploymentProgress(job, "err: " + data.toString()).catch(
        reject
      );
    });

    command.on("close", (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(code);
      }
    });

    command.on("error", (err) => {
      reject(err);
    });
  });
}

function getRepoDeployPath(params: DeploymentParams) {
  const repoPath = getRepoPath(params);
  const deployPath = getRelativePath(params.deployPath);
  let cwd = repoPath;
  if (deployPath.length > 0) {
    cwd += `/${deployPath}`;
  }
  return cwd;
}

function getRepoPath(params: DeploymentParams) {
  return `${DEPLOYMENTS_DIRECTORY}/${params.branch}`;
}

function getRelativePath(path: string) {
  return path.replace(/\/$/g, "").replace(/^\//g, "");
}

function appendLineToDeploymentProgress(job: Job, line: string) {
  const progress = getDeploymentProgress(job);
  progress.lines.push(line);
  return job.updateProgress(progress);
}

export function getDeploymentProgress(job: Job): DeploymentJobProgress {
  return isDeploymentJobProgress(job.progress) ? job.progress : { lines: [] };
}

function isDeploymentJobProgress(
  progress: Job["progress"] | DeploymentJobProgress
): progress is DeploymentJobProgress {
  return progress != null && (progress as DeploymentJobProgress).lines != null;
}

// function listActiveContainers() {
//   return exec(
//     `docker ps --format '{"id":"{{ .ID }}", "image": "{{ .Image }}", "name":"{{ .Names }}"}'`
//   );
// }
