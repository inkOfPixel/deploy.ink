import type { LoaderFunction, MetaFunction } from "remix";
import { json, useLoaderData } from "remix";

type IndexData = {};

// Loaders provide data to components and are only ever called on the server, so
// you can connect to a database or run any server side code you want right next
// to the component that renders it.
// https://remix.run/api/conventions#loader
export let loader: LoaderFunction = () => {
  let data: IndexData = {};

  // https://remix.run/api/remix#json
  return json(data);
};

// https://remix.run/api/conventions#meta
export let meta: MetaFunction = () => {
  return {
    title: "Deploy",
    description: "Welcome to deploy.ink!",
  };
};

// https://remix.run/guides/routing#index-routes
export default function Index() {
  let data = useLoaderData<IndexData>();

  return (
    <div className=" p-10">
      <main>
        <h2 className="text-4xl font-extrabold text-gray-200 tracking-tight">
          Welcome to Deploy.ink 🚀
        </h2>
      </main>
    </div>
  );
}
