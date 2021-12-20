import { Worker, WorkerOptions } from "bullmq";

const queueName = "push";

export function startPushWorker(options: WorkerOptions) {
  const worker = new Worker(
    queueName,
    async (job) => {
      console.log(job.name, job.data);
    },
    options
  );
  return worker;
}
