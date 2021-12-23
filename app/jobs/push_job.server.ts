import {
  createDeployment,
  DeploymentParams,
  listDeployments,
  redeploy,
} from "~/utils/deploy.server";
import { createAddJob, createWorker } from "~/utils/jobs.server";

const queueName = "push";

export interface PushJobPayload {
  branch: string;
  cloneUrl: string;
}

export const pushWorker = createWorker<PushJobPayload>(
  queueName,
  async (job) => {
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
);

export const addPushJob = createAddJob<PushJobPayload>({
  queueName,
  jobName: (payload) => `Deploy branch ${payload.branch}`,
});
