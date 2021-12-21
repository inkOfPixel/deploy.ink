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
    if (deployments.includes(branch)) {
      // redeploy
    } else {
      // create
      console.log("Creating deployment...");
      const result = await createDeployment({ branch, cloneUrl });
    }
  }
);

export const addPushJob = createAddJob<PushJobPayload>({
  queueName,
  jobName: (payload) => `Deploy branch ${payload.branch}`,
});
