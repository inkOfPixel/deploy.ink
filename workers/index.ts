import Redis from "ioredis";
import { pushWorker } from "../app/jobs/push_job.server";

checkRedisConnection().then(() => {
  console.log("redis is ready");
  pushWorker();
});

function checkRedisConnection() {
  return new Promise((resolve, reject) => {
    const redis = new Redis();
    let isWaitingForRedisServer = false;
    redis.on("error", () => {
      if (!isWaitingForRedisServer) {
        isWaitingForRedisServer = true;
        console.log("waiting for redis server...");
      }
    });
    redis.on("connect", () => {
      resolve(true);
    });
  });
}
