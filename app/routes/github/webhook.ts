import { ActionFunction, json } from "remix";

export const action: ActionFunction = async ({ request }) => {
  if (request.method === "POST") {
    console.log("\nNEW GITHUB WEBHOOK!!");
    const payload = await request.json();
    console.log(payload);
    return json(
      {
        message: "OK",
        event: "",
      },
      200
    );
  } else {
    return json({ message: "not supported" }, 400);
  }
};
