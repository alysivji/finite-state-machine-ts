import { execFileSync } from "node:child_process";

const versions = ["5.0.4", "5.9.3", "6.0.2"];
const commands = [
  ["tsc", "--pretty", "false", "--noEmit", "-p", "tsconfig.json"],
  ["tsc", "--pretty", "false", "--noEmit", "-p", "test/tsconfig.json"],
];

for (const version of versions) {
  console.log(`Checking TypeScript ${version}`);

  for (const command of commands) {
    execFileSync(
      "npm",
      ["exec", `--package=typescript@${version}`, "--", ...command],
      {
        stdio: "inherit",
      },
    );
  }
}
