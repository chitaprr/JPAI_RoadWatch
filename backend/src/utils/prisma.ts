import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import config from "../../config";
import { Pool } from "pg";

const pool = new Pool({ connectionString: config.DATABASE_URL });
const adapter = new PrismaPg({ connectionString: config.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export default prisma;
