import dayjs from "dayjs";
import calendar from "dayjs/plugin/calendar";
import { LoaderFunction } from "remix";
import invariant from "tiny-invariant";
import { JobStatusBadge } from "~/components/JobStatusBadge";
import { useSWRData } from "~/hooks/useSWRData";
import { PushJob } from "~/jobs/push_job.server";
import { getHumanReadableDateTime } from "~/utils/date";
import {
  DeploymentJobProgress,
  getDeploymentProgress,
} from "~/utils/deploy.server";

dayjs.extend(calendar);

interface JobData {
  id?: string;
  name: string;
  status: string;
  timestamp: string;
  attempts: number;
  failedReason: string;
  processedOn: string;
  finishedOn: string;
  returnValue: any;
  progress: DeploymentJobProgress;
}

interface LoaderData {
  job: JobData;
}

export let loader: LoaderFunction = async ({ params }): Promise<LoaderData> => {
  invariant(params.id, "Expected params.id");
  const rawJob = await PushJob.find(params.id);
  if (rawJob == null) {
    throw new Response("Not Found", { status: 404 });
  }
  let progress = getDeploymentProgress(rawJob);
  return {
    job: {
      id: params.id,
      name: rawJob.name,
      status: await rawJob.getState(),
      timestamp: new Date(rawJob.timestamp).toISOString(),
      attempts: rawJob.attemptsMade,
      failedReason: rawJob.failedReason,
      processedOn: rawJob.processedOn
        ? new Date(rawJob.processedOn).toISOString()
        : "",
      finishedOn: rawJob.finishedOn
        ? new Date(rawJob.finishedOn).toISOString()
        : "",
      returnValue: rawJob.returnvalue,
      progress,
    },
  };
};

export default function Job() {
  let { job } = useSWRData<LoaderData>();
  const timestamp = dayjs(job.timestamp);
  const processedOn = dayjs(job.processedOn);
  const finishedOn = dayjs(job.finishedOn);

  return (
    <div className="p-10">
      <div className="flex items-center">
        <h1 className="text-4xl font-extrabold text-gray-200 tracking-tight ">
          {" "}
          {job.name}{" "}
        </h1>
        <span className="ml-4 text-2xl text-gray-500">#{job.id}</span>
        <JobStatusBadge status={job.status} className="ml-4 text-base py-1" />
      </div>
      <div className="mt-2 text-gray-500">
        Created {getHumanReadableDateTime(timestamp)}
      </div>
      {processedOn.isValid() && (
        <div className="text-gray-500">
          Processed on {getHumanReadableDateTime(processedOn)}
        </div>
      )}
      {finishedOn.isValid() && (
        <div className="text-gray-500">
          Finished on {getHumanReadableDateTime(finishedOn)}
        </div>
      )}
      <div className="flex flex-col mt-10">
        <div className="bg-gray-800 overflow-hidden shadow rounded-lg divide-y divide-gray-700">
          <div className="px-4 py-5 sm:px-6">
            <span className="text-xl font-medium">Logs</span>
          </div>
          <div className="px-4 py-5 sm:p-6 min-h-[200px]">
            {job.progress.lines.map((line, index) => (
              <pre key={index} className="whitespace-pre-wrap">
                {line}
              </pre>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
