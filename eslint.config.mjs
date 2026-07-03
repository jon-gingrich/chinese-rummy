import convexPlugin from "@convex-dev/eslint-plugin";
import tseslint from "@typescript-eslint/eslint-plugin";
import tsparser from "@typescript-eslint/parser";

const typescriptRules = {
  "@typescript-eslint/no-floating-promises": "error",
  "@typescript-eslint/no-unused-vars": [
    "error",
    { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
  ],
};

export default [
  ...convexPlugin.configs.recommended,
  {
    files: ["convex/**/*.ts"],
    ignores: ["convex/_generated/**"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./convex/tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: typescriptRules,
  },
  {
    files: ["**/*.{ts,tsx}"],
    ignores: ["convex/**"],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        project: "./tsconfig.json",
      },
    },
    plugins: {
      "@typescript-eslint": tseslint,
    },
    rules: typescriptRules,
  },
  {
    ignores: [".next/**", "node_modules/**", "convex/_generated/**", "tests/**"],
  },
];
