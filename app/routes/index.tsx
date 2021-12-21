import type { MetaFunction } from "remix";

export let meta: MetaFunction = () => {
  return {
    title: "Deploy",
    description: "Welcome to deploy.ink!",
  };
};

export default function Index() {
  return (
    <div className=" p-10">
      <main>
        <h2 className="text-4xl font-extrabold text-gray-200 tracking-tight">
          Welcome to Deploy.ink!! 🚀
        </h2>
      </main>
    </div>
  );
}
