import getPort from "get-port";
import { SpawnCommand, Log, MacroCommand } from "~/lib/shell.server";

const DEPLOYMENTS_DIRECTORY = "/home/ubuntu/deployments";

export interface CreateDeploymentParams {
  branch: string;
  cloneUrl: string;
  rootDirectory?: string;
}

export async function createDeploymentMacro({
  branch,
  cloneUrl,
  rootDirectory,
}: CreateDeploymentParams): Promise<MacroCommand> {
  const port = await getPort();
  const branchHandle = getBranchHandle(branch);
  return {
    type: "macro",
    commands: [
      log("Prune inactive deployments.."),
      dockerSystemPruneCommand(),
      log("\nClone repo.."),
      cloneRepoCommand({ branch, path: branchHandle, cloneUrl }),
      log("\nAdd port to env file.."),
      addPortToEnvFileCommand({
        branchHandle: branchHandle,
        port,
        rootDirectory,
      }),
      log("\nStart containers.."),
      dockerStartContainersCommand({
        branchHandle: branchHandle,
        rootDirectory,
      }),
      log("\nAdd caddy route.."),
      addCaddyRouteCommand({
        branchHandle: branchHandle,
        port,
        rootDirectory,
      }),
    ],
  };
}

export interface UpdateDeploymentParams {
  branch: string;
  rootDirectory?: string;
}

export function updateDeploymentMacro({
  branch,
  rootDirectory,
}: UpdateDeploymentParams): MacroCommand {
  const branchHandle = getBranchHandle(branch);
  return {
    type: "macro",
    commands: [
      log("Prune inactive deployments.."),
      dockerSystemPruneCommand(),
      log("\nPulling latest changes.."),
      pullLatestChangesCommand({ branchHandle }),
      log("\nBuild new image.."),
      buildNewImageCommand({ branchHandle, rootDirectory }),
      log("\nRestart containers.."),
      restartContainersCommand({ branchHandle, rootDirectory }),
    ],
  };
}

function log(message: string): Log {
  return {
    type: "log",
    message,
  };
}

function dockerSystemPruneCommand(): SpawnCommand {
  return {
    type: "spawn-command",
    command: "docker",
    args: ["system", "prune", "-a", "--volumes", "-f"],
    workingDirectory: DEPLOYMENTS_DIRECTORY,
  };
}

interface CloneRepoCommandParams {
  branch: string;
  path: string;
  cloneUrl: string;
}

function cloneRepoCommand(params: CloneRepoCommandParams): SpawnCommand {
  return {
    type: "spawn-command",
    command: "git",
    args: ["clone", "-b", params.branch, params.cloneUrl, params.path],
    workingDirectory: DEPLOYMENTS_DIRECTORY,
  };
}

interface AddPortToEnvFileCommandParams {
  port: number;
  branchHandle: string;
  rootDirectory?: string;
}

function addPortToEnvFileCommand({
  port,
  branchHandle,
  rootDirectory,
}: AddPortToEnvFileCommandParams): SpawnCommand {
  const workingDirectory = getRepoDeployPath({
    rootDirectory,
    branchHandle,
  });
  return {
    type: "spawn-command",
    command: `echo "HOST_PORT=${port}" >> .env`,
    useShellSyntax: true,
    workingDirectory,
  };
}

interface DockerStartContainersCommandParams {
  branchHandle: string;
  rootDirectory?: string;
}

function dockerStartContainersCommand({
  branchHandle,
  rootDirectory,
}: DockerStartContainersCommandParams): SpawnCommand {
  const workingDirectory = getRepoDeployPath({
    rootDirectory,
    branchHandle,
  });
  return {
    type: "spawn-command",
    command: "docker",
    args: ["compose", "up", "-d"],
    workingDirectory,
  };
}

interface AddCaddyRouteCommandParams {
  port: number;
  branchHandle: string;
  rootDirectory?: string;
}

function addCaddyRouteCommand({
  port,
  branchHandle,
  rootDirectory,
}: AddCaddyRouteCommandParams): SpawnCommand {
  const workingDirectory = getRepoDeployPath({
    rootDirectory,
    branchHandle,
  });
  return {
    type: "spawn-command",
    command: "curl",
    args: [
      "localhost:2019/config/apps/http/servers/dashboard/routes",
      "-X",
      "POST",
      "-H",
      `"Content-Type: application/json"`,
      "-d",
      `'{ "handle": [ { "handler": "reverse_proxy", "transport": { "protocol": "http" }, "upstreams": [ { "dial": "localhost:${port}" } ] } ], "match": [ { "host": [ "${branchHandle}.deploy.ink" ] } ] }'`,
    ],
    workingDirectory,
  };
}

interface PullLatestChangesCommandParams {
  branchHandle: string;
}

function pullLatestChangesCommand({
  branchHandle,
}: PullLatestChangesCommandParams): SpawnCommand {
  const workingDirectory = getRepoPath(branchHandle);
  return {
    type: "spawn-command",
    command: "git",
    args: ["pull"],
    workingDirectory,
  };
}

interface BuildNewImageCommandParams {
  branchHandle: string;
  rootDirectory?: string;
}

function buildNewImageCommand({
  branchHandle,
  rootDirectory,
}: BuildNewImageCommandParams): SpawnCommand {
  const workingDirectory = getRepoDeployPath({
    branchHandle,
    rootDirectory,
  });
  return {
    type: "spawn-command",
    command: "docker",
    args: ["compose", "build", "--no-cache"],
    workingDirectory,
  };
}

interface restartContainersCommandParams {
  branchHandle: string;
  rootDirectory?: string;
}

function restartContainersCommand({
  branchHandle,
  rootDirectory,
}: restartContainersCommandParams): SpawnCommand {
  const workingDirectory = getRepoDeployPath({
    branchHandle,
    rootDirectory,
  });
  return {
    type: "spawn-command",
    command: "docker",
    args: ["compose", "up", "--no-deps", "-d"],
    workingDirectory,
  };
}

// UTILS

interface GetRepoDeployPathParams {
  branchHandle: string;
  rootDirectory?: string;
}

function getRepoDeployPath(params: GetRepoDeployPathParams) {
  const repoPath = getRepoPath(params.branchHandle);
  const deployPath = params.rootDirectory
    ? getRelativePath(params.rootDirectory)
    : "";
  let cwd = repoPath;
  if (deployPath.length > 0) {
    cwd += `/${deployPath}`;
  }
  return cwd;
}

function getRepoPath(branchHandle: string) {
  return `${DEPLOYMENTS_DIRECTORY}/${branchHandle}`;
}

function getRelativePath(path: string) {
  return path.replace(/\/$/g, "").replace(/^\//g, "");
}

function getBranchHandle(branch: string) {
  return branch.replace(/\//g, "-");
}
