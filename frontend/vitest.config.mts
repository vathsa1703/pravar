import { defineConfig } from "vitest/config";

// Pin a non-UTC time zone so the "local day" tests mean something on any machine.
process.env.TZ = "Asia/Kolkata";

export default defineConfig({
  test: { include: ["lib/**/*.test.ts"] },
});
