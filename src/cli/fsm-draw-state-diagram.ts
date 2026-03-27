#!/usr/bin/env node

import path from "node:path";
import { pathToFileURL } from "node:url";
import { generateStateDiagram } from "../diagram.js";
import { StateMachine } from "../state-machine.js";

interface CliOptions {
  classPath: string;
  initialState?: string;
}

await main();

async function main(): Promise<void> {
  try {
    const options = parseArgs(process.argv.slice(2));
    const machineClass = await loadStateMachineClass(options.classPath);
    const diagram = generateStateDiagram(machineClass, {
      initialState: options.initialState,
    });

    process.stdout.write(diagram);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    process.stderr.write(`${message}\n`);
    process.exitCode = 1;
  }
}

function parseArgs(args: string[]): CliOptions {
  let classPath: string | undefined;
  let initialState: string | undefined;

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }

    if (arg === "--class") {
      classPath = args[index + 1];
      index += 1;
      continue;
    }

    if (arg === "--initial-state") {
      initialState = args[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (classPath === undefined) {
    throw new Error('Missing required "--class" argument.');
  }

  return { classPath, initialState };
}

async function loadStateMachineClass(
  classPath: string,
): Promise<new (...args: never[]) => StateMachine<string>> {
  const separatorIndex = classPath.lastIndexOf(":");

  if (separatorIndex === -1) {
    throw new Error(
      'Expected "--class" in the format "<module-path>:<export-name>".',
    );
  }

  const modulePath = classPath.slice(0, separatorIndex);
  const exportName = classPath.slice(separatorIndex + 1);
  const moduleRef = await import(resolveModuleSpecifier(modulePath));
  const exportedValue = moduleRef[exportName];

  if (typeof exportedValue !== "function") {
    throw new Error(
      `Export "${exportName}" was not found or is not a class in ${modulePath}.`,
    );
  }

  return exportedValue as new (...args: never[]) => StateMachine<string>;
}

function resolveModuleSpecifier(modulePath: string): string {
  if (modulePath.startsWith(".") || modulePath.startsWith("/")) {
    return pathToFileURL(path.resolve(process.cwd(), modulePath)).href;
  }

  return modulePath;
}

function printHelp(): void {
  process.stdout.write(`Usage: fsm-draw-state-diagram --class <module-path>:<export-name> [--initial-state <state>]

Options:
  --class          ESM module path and exported class name
  --initial-state  Optional initial state for the Mermaid start node
  --help           Show this message
`);
}
