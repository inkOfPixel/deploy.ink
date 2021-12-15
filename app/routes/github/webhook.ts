import { ActionFunction, json } from "remix";

export const action: ActionFunction = ({ request }) => {
  if (request.method === "POST") {
    console.log("\nNEW GITHUB WEBHOOK!!");
    console.log(request.body);
  } else {
    return json({ message: "not supported" }, 400);
  }
};
