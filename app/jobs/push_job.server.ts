import { Job } from "bullmq";
import { DeployClient } from "~/sdk/deployments";
import { BaseJob } from "~/lib/jobs.server";
import { JobProgressLogger } from "~/lib/logger";

const queueName = "push";

export interface PushJobPayload {
  branch: string;
  cloneUrl: string;
}

export type PushJobResult = string;

export class PushJob extends BaseJob<PushJobPayload, PushJobResult> {
  readonly queueName = queueName;

  protected async perform(job: Job<PushJobPayload>) {
    const branch = job.data.branch;
    const cloneUrl = job.data.cloneUrl;
    const logger = new JobProgressLogger(job);
    const client = new DeployClient({
      logger,
    });
    const deployments = await client.deployments.list();
    if (deployments.includes(branch)) {
      await client.deployments.update({
        branch,
        rootDirectory: "",
      });
      return `Redeployed branch "${branch}"`;
    }
    await client.deployments.create({
      branch,
      cloneUrl,
      rootDirectory: "",
    });
    return `New deployment created for branch "${branch}"`;
  }

  protected getJobName(payload: PushJobPayload): string {
    return `Deploy branch ${payload.branch}`;
  }
}
