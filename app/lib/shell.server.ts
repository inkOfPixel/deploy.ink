import child from "child_process";
import { Logger } from "./logger";
import { promisify } from "util";

const exec = promisify(child.exec);

export interface Command {
  type: "command";
  command: string;
  args: string[];
  workingDirectory?: string;
}

export interface MacroCommand {
  type: "macro";
  commands: Array<Command | MacroCommand | Log>;
}

export interface Log {
  type: "log";
  message: string;
}

export interface ExecutionResult {
  output: string;
  error: string;
}

export type Program = Command | MacroCommand | Log;

export class Shell {
  private logger?: Logger;

  constructor(logger?: Logger) {
    this.logger = logger;
  }

  async execute(command: string): Promise<ExecutionResult> {
    const { stdout, stderr } = await exec(command);
    return {
      output: stdout,
      error: stderr,
    };
  }

  async spawn(program: Program): Promise<void> {
    switch (program.type) {
      case "command":
        await this.spawnCommand(program);
        break;
      case "macro":
        await Promise.all(
          program.commands.map((subcommand) => this.spawn(subcommand))
        );
        break;
      case "log":
        await this.logger?.info(program.message);
        break;
    }
  }

  private spawnCommand(command: Command): Promise<void> {
    return new Promise((resolve, reject) => {
      const commandProcess = child.spawn(command.command, command.args, {
        cwd: command.workingDirectory,
      });
      commandProcess.stdout.on("data", (data) => {
        this.logger?.info(this.convertInfoToMessage(data));
      });
      commandProcess.stderr.on("data", (data) => {
        this.logger?.error(this.convertErrorToMessage(data));
      });
      commandProcess.on("close", (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(code);
        }
      });
      commandProcess.on("error", (err) => {
        reject(err);
      });
    });
  }

  private convertInfoToMessage(data: unknown): string {
    let message = `! unknown log format: ${typeof data}`;
    if (typeof data === "string") {
      message = data;
    }
    return message;
  }

  private convertErrorToMessage(error: unknown): string {
    let message = `! unknown error format: ${typeof error}`;
    if (typeof error === "string") {
      message = error;
    }
    return message;
  }
}
