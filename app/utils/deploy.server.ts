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

export async function createDeployment(params: DeploymentParams, job: Job) {
  const port = await getPort();
  await appendLineToDeploymentProgress(job, "Clone repo..");
  await cloneRepo(params, job);
  await appendLineToDeploymentProgress(job, "Add port to env file..");
  await addPortToEnvFile(port, params, job);
  await appendLineToDeploymentProgress(job, "Start containers..");
  await startContainers(params, job);
  await appendLineToDeploymentProgress(job, "Add caddy route..");
  await addCaddyRoute(port, params, job);
}

function cloneRepo(params: DeploymentParams, job: Job) {
  return spawnCommand(job, "git", ["clone", params.cloneUrl, params.branch], {
    cwd: DEPLOYMENTS_DIRECTORY,
  });
}

function addPortToEnvFile(port: number, params: DeploymentParams, job: Job) {
  const deployPath = getRepoDeployPath(params);
  return spawnCommand(job, "echo", [`"HOST_PORT=${port}"`, ">>", ".env"], {
    cwd: deployPath,
  });
}

function startContainers(params: DeploymentParams, job: Job) {
  const deployPath = getRepoDeployPath(params);
  return spawnCommand(job, "docker", ["compose", "up", "-d"], {
    cwd: deployPath,
  });
}

function addCaddyRoute(port: number, params: DeploymentParams, job: Job) {
  const deployPath = getRepoDeployPath(params);
  return spawnCommand(
    job,
    "curl",
    [
      "localhost:2019/config/apps/http/servers/dashboard/routes",
      "-X",
      "POST",
      "-H",
      `"Content-Type: application/json"`,
      "-d",
      `'{ "handle": [ { "handler": "reverse_proxy", "transport": { "protocol": "http" }, "upstreams": [ { "dial": "localhost:${port}" } ] } ], "match": [ { "host": [ "${params.branch}.deploy.ink" ] } ] }'`,
    ],
    {
      cwd: deployPath,
    }
  );
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
  const repoPath = getRepoPath(params);
  return spawnCommand(job, "git", ["pull"], {
    cwd: repoPath,
  });
}

function buildNewImage(params: DeploymentParams, job: Job) {
  const deployPath = getRepoDeployPath(params);
  return spawnCommand(job, "docker", ["compose", "build", "--no-cache"], {
    cwd: deployPath,
  });
}

function restartContainers(params: DeploymentParams, job: Job) {
  const deployPath = getRepoDeployPath(params);
  return spawnCommand(job, "docker", ["compose", "up", "--no-deps", "-d"], {
    cwd: deployPath,
  });
}

function spawnCommand(
  job: Job,
  command: string,
  args: string[],
  options?: child.SpawnOptionsWithoutStdio
) {
  return new Promise((resolve, reject) => {
    const commandProcess = child.spawn(command, args, options);
    commandProcess.stdout.on("data", (data) => {
      appendLineToDeploymentProgress(job, data.toString()).catch(reject);
    });

    commandProcess.stderr.on("data", (data) => {
      appendLineToDeploymentProgress(job, "err: " + data.toString()).catch(
        reject
      );
    });

    commandProcess.on("close", (code) => {
      if (code === 0) {
        resolve(code);
      } else {
        reject(code);
      }
    });

    commandProcess.on("error", (err) => {
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
