import { createDeployment, listDeployments } from "~/utils/deploy.server";
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
    console.log(`Deploying ${branch}`);
    const cloneUrl = job.data.cloneUrl;
    const deployments = await listDeployments();
    console.log(`Deployments: ${deployments}`);
    const serialized = deployments.map((d) => `"${d}"`).join(", ");
    if (deployments.includes(branch)) {
      return `Redeployed branch "${branch}": [${serialized}]`;
    }
    // await createDeployment({ branch, cloneUrl });
    return `New deployment created for branch "${branch}": [${serialized}]`;
  }
);

export const addPushJob = createAddJob<PushJobPayload>({
  queueName,
  jobName: (payload) => `Deploy branch ${payload.branch}`,
});
