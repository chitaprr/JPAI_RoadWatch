import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    // Pliki testowe trafiają do tymczasowego katalogu, nie do realnego upload/.
    // Ustawione zanim config/upload.ts odczytają env (dotenv nie nadpisuje istniejących).
    env: {
      UPLOAD_DIR: path.resolve(process.cwd(), "upload_test"),
    },
    // Testy integracyjne współdzielą jedną bazę - bez równoległości plików.
    fileParallelism: false,
    hookTimeout: 20000,
    testTimeout: 20000,
  },
});
