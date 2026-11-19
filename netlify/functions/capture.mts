import type { Config } from "@netlify/functions";
import { capture } from "../lib/capture.mjs";

export default async () => {
  const result = await capture({ token: Netlify.env.get("GITHUB_TOKEN") });
  console.log(JSON.stringify(result));
  return Response.json(result);
};

// 19:08 UTC = 12:08 p.m. Denver in winter, 1:08 p.m. in summer.
export const config: Config = { schedule: "8 19 * * *" };
