import { DEPLOYMENTS_DIRECTORY, DEPLOY_DOMAIN } from "~/../config/env";
import { SpawnCommand } from "~/lib/shell.server";
import { getRepoDeployPath, getRepoPath } from "./helpers";

export function dockerSystemPruneCommand(): SpawnCommand {
  return {
    type: "spawn-command",
    command: "docker",
    args: ["system", "prune", "-a", "--volumes", "-f"],
  };
}

interface CloneRepoCommandOptions {
  branch: string;
  path: string;
  cloneUrl: string;
}

export function cloneRepoCommand(
  options: CloneRepoCommandOptions
): SpawnCommand {
  return {
    type: "spawn-command",
    command: "git",
    args: ["clone", "-b", options.branch, options.cloneUrl, options.path],
    workingDirectory: DEPLOYMENTS_DIRECTORY,
  };
}

interface AddPortToEnvFileCommandOptions {
  port: number;
  branchHandle: string;
  rootDirectory?: string;
}

export function addPortToEnvFileCommand({
  port,
  branchHandle,
  rootDirectory,
}: AddPortToEnvFileCommandOptions): SpawnCommand {
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

interface AddCaddyRouteCommandOptions {
  port: number;
  branchHandle: string;
  rootDirectory?: string;
}

export function addCaddyRouteCommand({
  port,
  branchHandle,
}: AddCaddyRouteCommandOptions): SpawnCommand {
  return {
    type: "spawn-command",
    command: `curl localhost:2019/config/apps/http/servers/dashboard/routes -X POST -H "Content-Type: application/json" -d '{ "@id": "${branchHandle}", "handle": [ { "handler": "reverse_proxy", "transport": { "protocol": "http" }, "upstreams": [ { "dial": "localhost:${port}" } ] } ], "match": [ { "host": [ "${branchHandle}.${DEPLOY_DOMAIN}" ] } ] }'`,
    useShellSyntax: true,
  };
}

interface PullLatestChangesCommandOptions {
  branchHandle: string;
}

export function pullLatestChangesCommand({
  branchHandle,
}: PullLatestChangesCommandOptions): SpawnCommand {
  const workingDirectory = getRepoPath(branchHandle);
  return {
    type: "spawn-command",
    command: "git",
    args: ["pull"],
    workingDirectory,
  };
}

interface DockerComposeUpCommandOptions {
  branchHandle: string;
  rootDirectory?: string;
}

export function dockerComposeUpCommand({
  branchHandle,
  rootDirectory,
}: DockerComposeUpCommandOptions): SpawnCommand {
  const workingDirectory = getRepoDeployPath({
    branchHandle,
    rootDirectory,
  });
  return {
    type: "spawn-command",
    command: "docker",
    args: ["compose", "up", "--no-deps", "--build", "-d"],
    workingDirectory,
  };
}

interface RemoveCaddyRouteCommandOptions {
  branchHandle: string;
}

export function removeCaddyRouteCommand({
  branchHandle,
}: RemoveCaddyRouteCommandOptions): SpawnCommand {
  return {
    type: "spawn-command",
    command: `curl -X DELETE localhost:2019/id/${branchHandle}`,
    useShellSyntax: true,
  };
}

interface DockerComposeDownCommandOptions {
  branchHandle: string;
  rootDirectory?: string;
}

export function dockerComposeDownCommand({
  branchHandle,
  rootDirectory,
}: DockerComposeDownCommandOptions): SpawnCommand {
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

interface RemoveDeploymentFolderOptions {
  branchHandle: string;
}

export function removeDeploymentFolder({
  branchHandle,
}: RemoveDeploymentFolderOptions): SpawnCommand {
  return {
    type: "spawn-command",
    command: `rm -rf ${branchHandle}`,
    useShellSyntax: true,
    workingDirectory: DEPLOYMENTS_DIRECTORY,
  };
}
