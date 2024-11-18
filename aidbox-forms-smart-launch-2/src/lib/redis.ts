import Redis from "ioredis";
import assert from "node:assert";

const url = process.env.REDIS_URL;
assert(url, "Environment variable REDIS_URL is required");

export const redis = new Redis(url);
