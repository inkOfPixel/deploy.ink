import { WorkerOptions } from "bullmq";
import { startPushWorker } from "./push_worker";
import { connection } from "@config/jobs";

const options: WorkerOptions = {
  connection,
};

startPushWorker(options);
