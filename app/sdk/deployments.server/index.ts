import getPort from "get-port";
import { Logger } from "~/lib/logger";
import { Shell } from "~/lib/shell.server";
import {
  addCaddyRouteCommand,
  addPortToEnvFileCommand,
  cloneRepoCommand,
  dockerComposeUpCommand,
  dockerSystemPruneCommand,
  pullLatestChangesCommand,
  removeCaddyRouteCommand,
  removeDeploymentFolder,
  dockerComposeDownCommand,
} from "./commands";
import { getBranchHandle, getRepoDeployPath } from "./helpers";
import fs from "fs/promises";

export interface DeployClientOptions {
  logger?: Logger;
}

interface DeploymentOptions {
  branch: string;
  cloneUrl: string;
  /**
   * The path where the docker compose file is located within the repo.
   */
  rootDirectory?: string;
}

interface DestroyDeploymentOptions {
  branch: string;
  /**
   * The path where the docker compose file is located within the repo.
   */
  rootDirectory?: string;
}

export class DeployClient {
  private logger?: Logger;
  private shell: Shell;

  constructor(options?: DeployClientOptions) {
    this.logger = options?.logger;
    this.shell = new Shell(this.logger);
  }

  public readonly deployments = {
    /**
     * Idempotent method to create a deployment.
     * @param options - The options to create the deployment.
     * @returns A promise that resolves when the deployment is created.
     */
    deploy: async (options: DeploymentOptions): Promise<void> => {
      const handle = getBranchHandle(options.branch);
      await this.shell.run(dockerSystemPruneCommand());
      const deploymentExists = await this.deployments.exists(options.branch);
      if (deploymentExists) {
        await this.log.info(
          `Deployment for branch "${options.branch}" already exists. Pulling latest changes to update.`
        );
        await this.shell.run(
          pullLatestChangesCommand({ branchHandle: handle })
        );
      } else {
        await this.log.info(
          `Creating deployment assets for branch "${options.branch}".`
        );
        await this.shell.run(
          cloneRepoCommand({
            branch: options.branch,
            cloneUrl: options.cloneUrl,
            path: handle,
          })
        );
      }
      let port = await this.queries.getDeploymentPort(
        options.branch,
        options.rootDirectory
      );
      if (port == null) {
        await this.log.info("No port found. Getting a new one..");
        port = await getPort();
        await this.shell.run(
          addPortToEnvFileCommand({
            port,
            branchHandle: handle,
            rootDirectory: options.rootDirectory,
          })
        );
      }
      await this.log.info("Starting deployment..");
      await this.shell.run(
        dockerComposeUpCommand({
          branchHandle: handle,
          rootDirectory: options.rootDirectory,
        })
      );
      const hasDomainRoute = await this.queries.hasDomainRoute(handle);
      if (!hasDomainRoute) {
        await this.log.info("Assigning domain to deployment..");
        await this.shell.run(
          addCaddyRouteCommand({
            port,
            branchHandle: handle,
            rootDirectory: options.rootDirectory,
          })
        );
      }
    },
    destroy: async (options: DestroyDeploymentOptions): Promise<void> => {
      const handle = getBranchHandle(options.branch);
      const hasDomainRoute = await this.queries.hasDomainRoute(handle);
      if (hasDomainRoute) {
        await this.log.info("Removing domain from deployment..");
        await this.shell.run(
          removeCaddyRouteCommand({
            branchHandle: handle,
          })
        );
      }
      await this.log.info("Stopping deployment..");
      await this.shell.run(
        dockerComposeDownCommand({
          branchHandle: handle,
          rootDirectory: options.rootDirectory,
        })
      );
      await this.log.info("Prune unused docker stuff..");
      await this.shell.run(dockerSystemPruneCommand());
      await this.log.info("Destroying deployment assets..");
      await this.shell.run(removeDeploymentFolder({ branchHandle: handle }));
    },
    list: async (): Promise<string[]> => {
      try {
        const result = await this.shell.run({
          type: "command",
          command: "ls ~/deployments",
        });
        if (result != null) {
          const dedupedWhitespaceOutput = result.output.replace(/(\s+)/g, " ");
          const folders = dedupedWhitespaceOutput
            .split(" ")
            .map((f) => f.trim())
            .filter((f) => f.length > 0);
          return folders;
        }
      } catch (error) {}
      return [];
    },
    exists: async (branch: string): Promise<boolean> => {
      const branchHandle = getBranchHandle(branch);
      const deployments = await this.deployments.list();
      return deployments.includes(branchHandle);
    },
  };

  public readonly system = {
    getFreeDiskSpace: async (): Promise<string> => {
      const result = await this.shell.run({
        type: "command",
        command: "df -Ph . | tail -1 | awk '{print $4}'",
      });
      if (result == null) {
        throw new Error("Failed to get free disk space");
      }
      return result.output;
    },
    getAvailableMemory: async (): Promise<string> => {
      const result = await this.shell.run({
        type: "command",
        command: "free -h | awk '/Mem:/ {print $7}'",
      });
      if (result == null) {
        throw new Error("Failed to get available memory");
      }
      return result.output;
    },
  };

  private readonly queries = {
    getDeploymentPort: async (
      branchHandle: string,
      rootDirectory?: string
    ): Promise<number | undefined> => {
      const deployPath = getRepoDeployPath({
        rootDirectory,
        branchHandle,
      });
      try {
        const result = await fs.readFile(`${deployPath}/.env`, "utf8");
        if (result == null) {
          return undefined;
        }
        const match = result.match(/HOST_PORT=(\d+)/);
        if (match && match[1]) {
          return parseInt(match[1], 10);
        }
      } catch (error) {}
      return undefined;
    },
    hasDomainRoute: async (branchHandle: string): Promise<boolean> => {
      const response = await fetch(`http://localhost:2019/id/${branchHandle}`);
      if (response.ok) {
        const json = await response.json();
        return json?.["@id"] === branchHandle;
      }
      return false;
    },
  };

  private readonly log = {
    info: async (message: string): Promise<void> => {
      if (this.logger) {
        await this.logger.info(message);
      } else {
        console.log(message);
      }
    },
    error: async (message: string): Promise<void> => {
      if (this.logger) {
        await this.logger.error(message);
      } else {
        console.error(message);
      }
    },
  };
}
