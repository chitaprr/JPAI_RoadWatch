import fs from "fs";
import path from "path";
import { openApiDocument } from "./openapi";

// Zapisuje statyczną specyfikację do openapi.json w katalogu backend/.
// Uruchom: `npm run docs:generate`. Przydatne do importu w Postman/Insomnia
// albo do generowania klientów (openapi-generator).
const outPath = path.resolve(__dirname, "../../openapi.json");
fs.writeFileSync(outPath, JSON.stringify(openApiDocument, null, 2));
console.log(`OpenAPI zapisane do ${outPath}`);
