import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
    ],
  },
  {
    rules: {
      // Allow any types for external libraries and complex types
      "@typescript-eslint/no-explicit-any": "warn",
      // Allow unused variables in API routes (Next.js pattern)
      "@typescript-eslint/no-unused-vars": "warn",
      // Allow require() for server-side libraries
      "@typescript-eslint/no-require-imports": "warn",
      // Allow unescaped entities in JSX (common in content)
      "react/no-unescaped-entities": "warn",
      // Allow missing dependencies in useEffect/useCallback (common pattern)
      "react-hooks/exhaustive-deps": "warn",
    },
  },
];

export default eslintConfig;
