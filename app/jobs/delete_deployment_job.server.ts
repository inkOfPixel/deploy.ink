import { Job } from "bullmq";
import { DeployClient } from "~/sdk/deployments.server";
import { BaseJob } from "~/lib/jobs.server";
import { JobProgressLogger } from "~/lib/logger";

const queueName = "delete_deployment";

export interface DeleteDeploymentPayload {
  branch: string;
  sender: {
    login: string;
    avatar_url: string;
  };
}

export type DeleteDeploymentResult = string;

export class DeleteDeploymentJob extends BaseJob<
  DeleteDeploymentPayload,
  DeleteDeploymentResult
> {
  readonly queueName = queueName;

  protected async perform(job: Job<DeleteDeploymentPayload>) {
    const branch = job.data.branch;
    const logger = new JobProgressLogger(job);
    const client = new DeployClient({
      logger,
    });
    const deployments = await client.deployments.list();
    if (deployments.includes(branch)) {
      await client.deployments.destroy({
        branch,
        rootDirectory: "",
      });
      return `Removed deployment for branch "${branch}"`;
    }
    throw new Error(`No deployment found for branch "${branch}"`);
  }

  protected getJobName(payload: DeleteDeploymentPayload): string {
    return `Remove deployment for branch "${payload.branch}"`;
  }
}
