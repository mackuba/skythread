import { defineConfig } from 'eslint/config';
import svelte from 'eslint-plugin-svelte';
import ts from 'typescript-eslint';

export default defineConfig(
  {
    ignores: ['dist/**', 'node_modules/**']
  },
  svelte.configs.base,
  {
    files: ['**/*.ts', '**/*.svelte'],
    plugins: {
      '@typescript-eslint': ts.plugin
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    },
    rules: {
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error'
    }
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: ts.parser
    }
  },
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parserOptions: {
        parser: ts.parser,
        extraFileExtensions: ['.svelte'],
        projectService: true,
        tsconfigRootDir: import.meta.dirname
      }
    }
  }
);
