import { Request } from "express";

declare module "express" {
  export interface Request {
    userId?: string; // Extend the Request type to include userId
    auth0Id?: string;
  }
}
export {}; // ✅ Ensure this file is treated as a module
