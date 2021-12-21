import type { LoaderFunction } from "remix";
import { useLoaderData } from "remix";
import { getQueue } from "~/utils/jobs.server";
import { classNames } from "~/utils/styles";

interface Job {
  id?: string;
  name: string;
  status: string;
  timestamp: string;
  attempts: number;
  failedReason: string;
  processedOn: string;
  finishedOn: string;
}

interface LoaderData {
  jobs: Job[];
}

export let loader: LoaderFunction = async (): Promise<LoaderData> => {
  const queue = getQueue("push");
  const rawJobs = await queue.getJobs(
    ["completed", "failed", "delayed", "active", "wait", "paused", "repeat"],
    0,
    100
  );
  const jobs = await Promise.all(
    rawJobs.map(async (job): Promise<Job> => {
      const status = await job.getState();
      return {
        id: job.id,
        name: job.name,
        status,
        attempts: job.attemptsMade,
        failedReason: job.failedReason,
        timestamp: new Date(job.timestamp).toISOString(),
        processedOn: job.processedOn
          ? new Date(job.processedOn).toISOString()
          : "",
        finishedOn: job.finishedOn
          ? new Date(job.finishedOn).toISOString()
          : "",
      };
    })
  );
  return {
    jobs,
  };
};

export default function Jobs() {
  let data = useLoaderData<LoaderData>();
  return (
    <div>
      <h1 className="ml-10 pt-10 text-4xl font-extrabold text-gray-200 tracking-tight">
        Jobs
      </h1>
      <div className="flex flex-col p-10">
        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
            <div className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Name
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Status
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Timestamp
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      ProcessedOn
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      FinishedOn
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Attempts
                    </th>
                    <th
                      scope="col"
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      Failed reason
                    </th>
                    <th scope="col" className="relative px-6 py-3">
                      <span className="sr-only">Edit</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {data.jobs.map((job) => (
                    <tr key={job.id}>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="text-sm font-medium text-gray-900">
                            {job.name}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={classNames(
                            "px-2 inline-flex text-xs leading-5 font-semibold rounded-full",
                            job.status === "completed" &&
                              "bg-green-100 text-green-800",
                            job.status === "failed" &&
                              "bg-red-100 text-red-800",
                            job.status === "delayed" &&
                              "bg-yellow-100 text-yellow-800",
                            job.status === "active" &&
                              "bg-blue-100 text-blue-800",
                            job.status === "wait" &&
                              "bg-orange-100 text-orange-800",
                            job.status === "paused" &&
                              "bg-purple-100 text-purple-800",
                            job.status === "repeat" &&
                              "bg-gray-100 text-gray-800"
                          )}
                        >
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {job.timestamp}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {job.processedOn}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {job.finishedOn}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {job.attempts}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {job.failedReason}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <a
                          href="#"
                          className="text-indigo-600 hover:text-indigo-900"
                        >
                          Edit
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
