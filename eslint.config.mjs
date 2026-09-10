import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,

  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),

  /**
   * THE ARCHITECTURE BOUNDARY.
   *
   * Puzzle Media's own front end arrives later and has to be reconcilable
   * with this one, which only works if presentational components stay
   * separable from data access. Components take data as props and emit
   * intent as callbacks; fetching happens in feature containers.
   *
   * This is a lint rule rather than a convention because the boundary
   * erodes within a fortnight otherwise, and by then unpicking it is
   * expensive.
   */
  {
    files: ["src/components/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/api", "@/lib/api/*", "@/features", "@/features/*"],
              // Type-only imports carry no runtime coupling: a component may
              // name the shape it renders without knowing where it came from.
              allowTypeImports: true,
              message:
                "components/ must stay presentational. Fetch in features/*/containers and pass data down as props.",
            },
          ],
        },
      ],
    },
  },

  /**
   * THE TOKEN BOUNDARY.
   *
   * Re-skinning must be an edit to globals.css, not a search across every
   * screen. Components reference semantic tokens only — never a raw hex
   * value, and never an arbitrary colour class.
   *
   * Dark mode is re-picked rather than inverted (the light brand teal fails
   * contrast on charcoal), so a hardcoded colour is not merely untidy: it is
   * a colour that cannot adapt.
   */
  {
    files: ["src/components/**/*.{ts,tsx}", "src/features/**/*.{ts,tsx}", "src/app/**/*.tsx"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "Literal[value=/(bg|text|border|ring|fill|stroke|from|to|via)-\\\\[#[0-9a-fA-F]{3,8}\\\\]/]",
          message:
            "Use a semantic token (bg-surface, text-muted-foreground, …) rather than a hardcoded colour. The token layer is what makes a re-skin one file.",
        },
        {
          selector: "TemplateElement[value.raw=/#[0-9a-fA-F]{6}\\\\b/]",
          message:
            "Hardcoded hex colour. Define it in globals.css and reference the token.",
        },
      ],
    },
  },
]);

export default eslintConfig;
