// @ts-check
import globals from 'globals';

import { createBaseConfig } from '../../packages/config/eslint-base.mjs';

const baseConfig = createBaseConfig({ tsconfigRootDir: import.meta.dirname });

export default [
  {
    ignores: ['eslint.config.mjs'],
  },
  ...baseConfig,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      sourceType: 'commonjs',
    },
  },
];
