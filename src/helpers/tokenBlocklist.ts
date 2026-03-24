// import redis from "../app/config/redis";


// export const blockToken = async (token: string, expiresInSeconds: number) => {
//   await redis.set(`blocklist:${token}`, '1', 'EX', expiresInSeconds);
// };

// export const isTokenBlocklisted = async (token: string): Promise<boolean> => {
//   const result = await redis.get(`blocklist:${token}`);
//   return result !== null;
// };