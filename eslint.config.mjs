import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    // Dates and times always belong to a city (WIB/WITA/WIT), never to the device's own
    // time zone: src/lib/city-time.ts does that arithmetic, in UTC
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/city-time.ts", "src/**/*.test.{ts,tsx}", "src/__tests__/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name=/^(getFullYear|getMonth|getDate|getDay|getHours|getMinutes|getTimezoneOffset|setFullYear|setMonth|setDate|setHours|setMinutes|toLocaleDateString|toLocaleTimeString)$/]",
          message: "Device-local date: use src/lib/city-time.ts (cityDate, citySecondsOfDay, cityInstant, ...)",
        },
      ],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated reports
    "coverage/**",
    "playwright-report/**",
    "test-results/**",
  ]),
]);

export default eslintConfig;
