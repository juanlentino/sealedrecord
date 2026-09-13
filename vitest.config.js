import { defineConfig, configDefaults } from "vitest/config";

/* site/sealedrecord is a symlink to the checkout for local development;
   without this exclude vitest would collect the suite twice through it. */
export default defineConfig({
  test: { exclude: [...configDefaults.exclude, "site/**", "dist-site/**"] },
});
