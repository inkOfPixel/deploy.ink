import type { MetaFunction } from "remix";

export let meta: MetaFunction = () => {
  return {
    title: "Deploy",
    description: "Welcome to deploy.ink!",
  };
};

const stats = [
  { name: "Free disk space", stat: "71,897" },
  { name: "Available memory", stat: "58.16%" },
  { name: "Active containers", stat: "24.57%" },
];

export default function Index() {
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
