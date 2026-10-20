import js from "@eslint/js";
import boundaries from "eslint-plugin-boundaries";
import jsxA11y from "eslint-plugin-jsx-a11y";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist", "design-system", "prototipos", "src/shared/api/schema.d.ts"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  jsxA11y.flatConfigs.recommended,
  reactHooks.configs.flat.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: { boundaries },
    settings: {
      "import/resolver": {
        typescript: { project: "./tsconfig.app.json" },
      },
      "boundaries/elements": [
        { type: "app", pattern: "src/app" },
        { type: "feature", pattern: "src/features/*", capture: ["name"] },
        { type: "shared", pattern: "src/shared" },
      ],
    },
    rules: {
      "boundaries/dependencies": [
        "error",
        {
          default: "disallow",
          policies: [
            // Dentro do mesmo elemento (uma feature) vale tudo.
            { allow: { dependency: { relationship: { to: "internal" } } } },
            // app compõe shared e as features.
            { from: { element: { type: "app" } }, allow: { to: { element: { type: "shared" } } } },
            // shared não conhece features nem app.
            {
              from: { element: { type: "shared" } },
              allow: { to: { element: { type: "shared" } } },
            },
            // features usam shared.
            {
              from: { element: { type: "feature" } },
              allow: { to: { element: { type: "shared" } } },
            },
            // Uma feature só é alcançada pelo index.ts público (de app ou de outra feature).
            {
              from: { element: { types: { anyOf: ["app", "feature"] } } },
              allow: { to: { element: { type: "feature", fileInternalPath: "index.ts" } } },
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/shared/api/**", "src/**/*.test.{ts,tsx}", "src/test/**"],
    rules: {
      "no-restricted-globals": [
        "error",
        { name: "fetch", message: "Chame a API só por shared/api (ADR 0002 e 0006)." },
      ],
    },
  },
);
