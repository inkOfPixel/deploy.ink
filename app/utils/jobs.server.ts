import { Job, Queue, Worker, WorkerOptions } from "bullmq";
import { connection } from "../../config/jobs";

const options: WorkerOptions = {
  connection,
};

export function createWorker<Payload = any>(
  queueName: string,
  handler: (job: Job<Payload, any, string>) => Promise<any>
) {
  return () => {
    const worker = new Worker<Payload>(queueName, handler, options);
    return worker;
  };
}

export interface CreateAddJobArgs<Payload = any> {
  queueName: string;
  jobName: string | ((payload: Payload) => string);
}

export function createAddJob<Payload = any>(args: CreateAddJobArgs<Payload>) {
  return async (payload: Payload) => {
    const queue = getQueue(args.queueName);
    const jobName =
      typeof args.jobName === "function" ? args.jobName(payload) : args.jobName;
    const result = await queue.add(jobName, payload);
    return result;
  };
}

export function getQueue(queueName: string) {
  return new Queue(queueName, { connection });
}

export async function getJobs(queueName: string, size: number): Promise<Job[]> {
  const queue = getQueue(queueName);
  const jobs = await queue.getJobs(
    ["active", "completed", "failed", "delayed", "wait", "paused", "repeat"],
    0,
    size
  );
  jobs.sort(recentFirst);
  return jobs;
}

function recentFirst(a: Job, b: Job) {
  return b.timestamp - a.timestamp;
}

export async function getJob(queueName: string, id: string): Promise<Job> {
  const queue = getQueue(queueName);
  const job = await queue.getJob(id);
  if (job == null) {
    throw new Response("Not Found", { status: 404 });
  }
  return job;
}
