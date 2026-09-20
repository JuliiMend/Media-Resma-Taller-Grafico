import "dotenv/config";

export const env = {
  port: Number(process.env.PORT ?? 4000),
  apiKey: process.env.API_KEY ?? "",
};
