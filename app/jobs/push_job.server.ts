import { Job } from "bullmq";
import { DeployClient } from "~/sdk/deployments.server";
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
    await client.deployments.deploy({
      branch,
      cloneUrl,
      rootDirectory: "",
    });
    return `Deployed branch "${branch}"`;
  }

  protected getJobName(payload: PushJobPayload): string {
    return `Deploy branch ${payload.branch}`;
  }
}
