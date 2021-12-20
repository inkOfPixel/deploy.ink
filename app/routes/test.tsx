import { connection } from "@config/jobs";
import { Queue } from "bullmq";
import { LoaderFunction } from "remix";

const queue = new Queue("push", connection);

export const loader: LoaderFunction = async () => {
  const result = await queue.add("Hello job", { value: 10 });
  console.log("result", result.data);
  return result.data;
};
