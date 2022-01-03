import { Logger } from "~/lib/logger";
import { Shell } from "~/lib/shell.server";
import {
  createDeploymentMacro,
  destroyDeploymentMacro,
  updateDeploymentMacro,
} from "./commands";

export interface DeployClientOptions {
  logger?: Logger;
}

interface CreateDeploymentOptions {
  branch: string;
  cloneUrl: string;
  /**
   * The path where the docker compose file is located within the repo.
   */
  rootDirectory?: string;
}

interface UpdateDeploymentOptions {
  branch: string;
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
    create: async (options: CreateDeploymentOptions): Promise<void> => {
      const createMacro = await createDeploymentMacro(options);
      await this.shell.run(createMacro);
    },
    update: async (options: UpdateDeploymentOptions): Promise<void> => {
      const updateMacro = updateDeploymentMacro(options);
      await this.shell.run(updateMacro);
    },
    destroy: async (options: DestroyDeploymentOptions): Promise<void> => {
      const destroyMacro = destroyDeploymentMacro(options);
      await this.shell.run(destroyMacro);
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
}
