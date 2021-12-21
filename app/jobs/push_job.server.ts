import { listDeployments } from "~/utils/deploy.server";
import { createAddJob, createWorker } from "~/utils/jobs.server";

const queueName = "push";

export interface JobPayload {
  branch: string;
}

export const pushWorker = createWorker<JobPayload>(queueName, async (job) => {
  console.log(`Deploying ${job.data.branch}`);
  try {
    const deployments = await listDeployments();
    console.log(deployments);
  } catch (error) {
    console.error("ERROR", error);
  }
  console.log(job.name, job.data);
});

export const addPushJob = createAddJob({
  queueName,
  jobName: (payload) => `Deploy branch ${payload.branch}`,
});
