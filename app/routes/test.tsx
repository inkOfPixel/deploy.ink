import { LoaderFunction } from "remix";
import { PushQueue } from "~/jobs/push_job.server";

export const loader: LoaderFunction = async () => {
  const result = await PushQueue.add({ branch: "jobs", cloneUrl: "" });
  console.log("result", result.data);
  return result.data;
};
