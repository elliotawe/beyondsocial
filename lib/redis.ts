import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL;

if (!REDIS_URL) {
    throw new Error("Please define the REDIS_URL environment variable inside .env.local");
}

const redis = new Redis(REDIS_URL);

export default redis;
