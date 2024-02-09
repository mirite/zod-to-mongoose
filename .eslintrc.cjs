module.exports = {
    env: {
        es2021: true,
        node: true,
    },
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended", "plugin:jsdoc/recommended-typescript"],
    overrides: [],
    parser: "@typescript-eslint/parser",
    parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
    },
    plugins: ["jsdoc", "@typescript-eslint"],
    rules: {
        "jsdoc/tag-lines": "off",
    },
};
