import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const buildDirectory = "dist";
const uploadToken =
  process.env.BUNDLE_ANALYZER_UPLOAD_TOKEN ?? process.env.CODECOV_TOKEN;

if (!uploadToken) {
  console.log(
    "Skipping Codecov bundle analysis because no upload token is configured.",
  );
  process.exit(0);
}

if (!existsSync(buildDirectory)) {
  console.error(
    "Codecov bundle analysis requires a built dist/ directory. Run the build first.",
  );
  process.exit(1);
}

const result = spawnSync(
  "npx",
  [
    "bundle-analyzer",
    buildDirectory,
    "--bundle-name",
    "finite-state-machine-ts",
    "--upload-token",
    uploadToken,
    "--ignore-patterns",
    "**/*.d.ts",
    "--ignore-patterns",
    "**/*.map",
  ],
  {
    stdio: "inherit",
    env: process.env,
  },
);

if (result.error) {
  throw result.error;
}

process.exit(result.status ?? 1);
