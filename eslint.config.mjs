import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Prisma's generated client (rebuilt by `prisma generate`).
    "generated/**",
  ]),
  {
    rules: {
      // Project style: `const f = () => {}` instead of `function f() {}`.
      "func-style": ["error", "expression"],
      // func-style skips `export default function`, which Next.js pages and
      // layouts commonly use, so flag that form too.
      "no-restricted-syntax": [
        "error",
        {
          selector: "ExportDefaultDeclaration > FunctionDeclaration",
          message:
            "Use an arrow function: `const Page = () => { ... }; export default Page;`",
        },
      ],
    },
  },
]);

export default eslintConfig;
