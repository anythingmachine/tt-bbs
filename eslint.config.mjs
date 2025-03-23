import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: {
    extends: ["eslint:recommended"]
  }
});

const eslintConfig = [
  // Base configurations
  ...compat.extends(
    "next/core-web-vitals", 
    "next/typescript",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@next/eslint-plugin-next/recommended",
    
  ),
  {
    ignores: [
      'node_modules/*',
      'build/*',
      'public/*',
      '.next/*'
    ]
  },
  // Global configurations
  {
    files: ["**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      "no-alert": "error",
      "react-hooks/exhaustive-deps": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": ["warn", { 
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_" 
      }], // Prevent unused variables except those starting with underscore
      "react/prop-types": "off", // Disable prop-types validation since we use TypeScript interfaces
      "react/display-name": "warn", // Warn instead of error for display names
      
    },
  },
  
  // Special handling for specific files
  {
    files: ["**/tests/**/*.{js,jsx,ts,tsx}", "**/*.test.{js,jsx,ts,tsx}"],
    rules: {
      // Relaxed rules for test files
      "max-lines-per-function": "off",
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];

export default eslintConfig;
