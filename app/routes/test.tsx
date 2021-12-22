import { LoaderFunction } from "remix";
import { addPushJob } from "~/jobs/push_job.server";

export const loader: LoaderFunction = async () => {
  const result = await addPushJob({ branch: "jobs", cloneUrl: "" });
  console.log("result", result.data);
  return result.data;
};
