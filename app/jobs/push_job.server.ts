import { Job } from "bullmq";
import {
  createDeployment,
  DeploymentParams,
  listDeployments,
  redeploy,
} from "~/utils/deploy.server";
import { BaseJob } from "~/utils/jobs.server";

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
    const deployments = await listDeployments();
    const params: DeploymentParams = {
      branch,
      cloneUrl,
      deployPath: "",
    };
    if (deployments.includes(branch)) {
      await redeploy(params, job);
      return `Redeployed branch "${branch}"`;
    }
    await createDeployment(params, job);
    return `New deployment created for branch "${branch}"`;
  }

  protected getJobName(payload: PushJobPayload): string {
    return `Deploy branch ${payload.branch}`;
  }
}
