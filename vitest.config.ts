import ts from "typescript";
import { defineConfig } from "vitest/config";

// Vite's built-in transformer (Oxc) does not lower standard TC39 decorators,
// and Node cannot run them natively yet, so compile TypeScript with tsc.
export default defineConfig({
  oxc: false,
  plugins: [
    {
      name: "typescript-standard-decorators",
      enforce: "pre",
      transform(code, id) {
        if (!/\.[cm]?ts$/.test(id)) {
          return null;
        }

        const output = ts.transpileModule(code, {
          fileName: id,
          compilerOptions: {
            module: ts.ModuleKind.ESNext,
            target: ts.ScriptTarget.ES2022,
            sourceMap: true,
          },
        });

        return { code: output.outputText, map: output.sourceMapText };
      },
    },
  ],
});
