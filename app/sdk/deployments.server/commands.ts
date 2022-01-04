import getPort from "get-port";
import { SpawnCommand, Log, MacroCommand } from "~/lib/shell.server";
import {
  DEPLOYMENTS_DIRECTORY,
  DEPLOY_DOMAIN,
  getBranchHandle,
  getRepoDeployPath,
  getRepoPath,
} from "./helpers";

/**
 * @param branch - The branch to deploy.
 * @param cloneUrl - The url to clone the repo from.
 * @param rootDirectory - The root directory that contains the docker compose file.
 * @returns The macro to deploy the repo.
 */
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
        branchHandle,
        port,
        rootDirectory,
      }),
      log("\nStart containers.."),
      dockerStartContainersCommand({
        branchHandle,
        rootDirectory,
      }),
      log("\nAdd caddy route.."),
      addCaddyRouteCommand({
        branchHandle,
        port,
        rootDirectory,
      }),
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
}: AddCaddyRouteCommandParams): SpawnCommand {
  return {
    type: "spawn-command",
    command: `curl localhost:2019/config/apps/http/servers/dashboard/routes -X POST -H "Content-Type: application/json" -d '{ "@id": "${branchHandle}", "handle": [ { "handler": "reverse_proxy", "transport": { "protocol": "http" }, "upstreams": [ { "dial": "localhost:${port}" } ] } ], "match": [ { "host": [ "${branchHandle}.${DEPLOY_DOMAIN}" ] } ] }'`,
    useShellSyntax: true,
  };
}

/**
 * @param branch - The branch to redeploy.
 * @param rootDirectory - The root directory that contains the docker compose file.
 * @returns The macro to redeploy the branch.
 * @description This command will pull the latest changes from the repo, build a new image, and restart the containers.
 */
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

interface RestartContainersCommandParams {
  branchHandle: string;
  rootDirectory?: string;
}

function restartContainersCommand({
  branchHandle,
  rootDirectory,
}: RestartContainersCommandParams): SpawnCommand {
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

/**
 * @param branch - The branch to destroy.
 * @param rootDirectory - The root directory that contains the docker compose file.
 * @returns The macro to remove the branch deployment.
 */
export interface DestroyDeploymentParams {
  branch: string;
  rootDirectory?: string;
}

export function destroyDeploymentMacro({
  branch,
  rootDirectory,
}: DestroyDeploymentParams): MacroCommand {
  const branchHandle = getBranchHandle(branch);
  return {
    type: "macro",
    commands: [
      log("\nRemove caddy route.."),
      removeCaddyRouteCommand({ branchHandle }),
      log("\nStop containers.."),
      stopContainersCommand({ branchHandle, rootDirectory }),
      log("Prune unused stuff.."),
      dockerSystemPruneCommand(),
      log("\nRemove deployment folder.."),
      removeDeploymentFolder({ branchHandle }),
    ],
  };
}

interface RemoveCaddyRouteCommandParams {
  branchHandle: string;
}

function removeCaddyRouteCommand({
  branchHandle,
}: RemoveCaddyRouteCommandParams): SpawnCommand {
  return {
    type: "spawn-command",
    command: `curl -X DELETE localhost:2019/id/${branchHandle}`,
    useShellSyntax: true,
  };
}

interface StopContainersCommandParams {
  branchHandle: string;
  rootDirectory?: string;
}

function stopContainersCommand({
  branchHandle,
  rootDirectory,
}: StopContainersCommandParams): SpawnCommand {
  const workingDirectory = getRepoDeployPath({
    branchHandle,
    rootDirectory,
  });
  return {
    type: "spawn-command",
    command: "docker",
    args: ["compose", "down"],
    workingDirectory,
  };
}

interface RemoveDeploymentFolderParams {
  branchHandle: string;
}

function removeDeploymentFolder({
  branchHandle,
}: RemoveDeploymentFolderParams): SpawnCommand {
  return {
    type: "spawn-command",
    command: `rm -rf ${branchHandle}`,
    useShellSyntax: true,
    workingDirectory: DEPLOYMENTS_DIRECTORY,
  };
}
