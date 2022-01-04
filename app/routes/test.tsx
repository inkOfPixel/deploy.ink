import { LoaderFunction } from "remix";
import { PushJob } from "~/jobs/push_job.server";

export const loader: LoaderFunction = async () => {
  const result = await PushJob.performLater({
    branch: "jobs",
    cloneUrl: "https://github.com/inkOfPixel/strapi-demo.git",
  });
  return result.data;
};
