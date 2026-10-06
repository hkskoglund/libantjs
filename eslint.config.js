const js = require("@eslint/js");
const globals = require("globals");

module.exports = [
  {
    ignores: ["node_modules/**"]
  },
  {
    files: ["**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "commonjs",
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.webextensions,
        Windows: "readonly",
        define: "readonly"
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unassigned-vars": "off",
      "no-unused-vars": ["warn", { args: "none" }],
      "no-useless-assignment": "off"
    }
  },
  {
    files: ["legacy/**/*.js"],
    languageOptions: {
      globals: {
        setting: "readonly"
      }
    }
  }
];
