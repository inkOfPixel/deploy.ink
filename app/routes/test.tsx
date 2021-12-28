import { LoaderFunction } from "remix";
import { PushJob } from "~/jobs/push_job.server";

export const loader: LoaderFunction = async () => {
  const result = await PushJob.performLater({ branch: "jobs", cloneUrl: "" });
  console.log("result", result.data);
  return result.data;
};
