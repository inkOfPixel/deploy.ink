import { LoaderFunction, MetaFunction, useLoaderData } from "remix";
import { DeployClient } from "~/sdk/deployments";

export let meta: MetaFunction = () => {
  return {
    title: "Deploy",
    description: "Welcome to deploy.ink!",
  };
};

interface Stat {
  name: string;
  stat: string;
}

interface LoaderData {
  stats: Stat[];
}

export let loader: LoaderFunction = async (): Promise<LoaderData> => {
  const client = new DeployClient();
  const freeDiskSpace = await client.system.getFreeDiskSpace();
  const availableMemory = await client.system.getAvailableMemory();
  const deployments = await client.deployments.list();
  return {
    stats: [
      { name: "Free Disk Space", stat: freeDiskSpace },
      { name: "Available memory", stat: availableMemory },
      { name: "Deployments count", stat: deployments.length.toString() },
    ],
  };
};

export default function Index() {
  const { stats } = useLoaderData<LoaderData>();
  return (
    <>
      <header>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl font-bold leading-tight text-gray-900">
            Dashboard
          </h1>
        </div>
      </header>
      <main>
        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
          <div className="px-4 py-8 sm:px-0">
            <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-3">
              {stats.map((item) => (
                <div
                  key={item.name}
                  className="px-4 py-5 bg-white shadow rounded-lg overflow-hidden sm:p-6"
                >
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {item.name}
                  </dt>
                  <dd className="mt-1 text-3xl font-semibold text-gray-900">
                    {item.stat}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </main>
    </>
  );
}
