"use server";

import Redis from "ioredis";
import { cache } from "react";

export const createRedis = cache(
  async () => new Redis(process.env.REDIS_URL as string),
);
