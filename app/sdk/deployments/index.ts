import { Logger } from "~/lib/logger";
import { Shell } from "~/lib/shell.server";
import { createDeploymentMacro, updateDeploymentMacro } from "./commands";

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
      await this.shell.spawn(createMacro);
    },
    update: async (options: UpdateDeploymentOptions): Promise<void> => {
      const updateMacro = updateDeploymentMacro(options);
      await this.shell.spawn(updateMacro);
    },
    destroy: async (options: UpdateDeploymentOptions): Promise<void> => {
      // ..
      throw new Error("Not implemented");
    },
    list: async (): Promise<string[]> => {
      try {
        const { output } = await this.shell.execute("ls ~/deployments");
        const dedupedWhitespaceOutput = output.replace(/(\s+)/g, " ");
        const folders = dedupedWhitespaceOutput
          .split(" ")
          .map((f) => f.trim())
          .filter((f) => f.length > 0);
        return folders;
      } catch (error) {
        return [];
      }
    },
  };

  public readonly system = {
    getFreeDiskSpace: async (): Promise<string> => {
      const { output } = await this.shell.execute(
        "df -Ph . | tail -1 | awk '{print $4}'"
      );
      return output;
    },
  };
}
