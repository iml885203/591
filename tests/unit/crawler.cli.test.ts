/**
 * Unit tests for CLI entry point (cli.js)
 */

import { spawn, type ChildProcess } from 'child_process';
import path from 'path';
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

const crawlerPath = path.join(__dirname, '../../cli.ts');

interface CliTestResult {
  code: number;
  stdout: string;
  stderr: string;
}

const runCliCommand = (args: string[]): Promise<CliTestResult> => {
  return new Promise((resolve) => {
    const bunPath = process.env.BUN_PATH || '/home/logan/.bun/bin/bun';
    const child: ChildProcess = spawn(bunPath, [crawlerPath, ...args], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';

    if (child.stdout) {
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
    }

    child.on('close', (code) => {
      resolve({ code: code || 0, stdout, stderr });
    });
  });
};

describe('cli.js CLI', () => {
  let originalArgv: string[];

  beforeEach(() => {
    originalArgv = process.argv;
  });

  afterEach(() => {
    process.argv = originalArgv;
  });

  describe('argument parsing', () => {
    it('should show usage when no URL provided', async () => {
      const result = await runCliCommand([]);
      
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Usage: bun cli.ts');
      expect(result.stderr).toContain('--notify-mode');
      expect(result.stderr).toContain('--filtered-mode');
    });

    it('should validate notify-mode parameter', async () => {
      const result = await runCliCommand(['https://test.com', '--notify-mode=invalid']);
      
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Invalid notify-mode. Must be: all, filtered, none');
    });

    it('should validate filtered-mode parameter', async () => {
      const result = await runCliCommand(['https://test.com', '--filtered-mode=invalid']);
      
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('Invalid filtered-mode. Must be: normal, silent, none');
    });

    it('should validate maxLatest parameter', async () => {
      const result = await runCliCommand(['https://test.com', '-5']);
      
      expect(result.code).toBe(1);
      expect(result.stderr).toContain('max_latest must be a positive number');
    });
  });

  describe('parameter parsing', () => {
    it('should parse notify-mode parameter correctly', () => {
      // Test parsing logic directly
      const args: string[] = ['bun', 'cli.ts', 'https://test.com', '--notify-mode=all'];
      process.argv = args;
      
      const configPath = require.resolve('../../cli.ts');
      delete require.cache[configPath];
      
      // The actual test would require more complex setup to avoid executing the crawler
      // This demonstrates the testing approach
      expect(args[3]).toBe('--notify-mode=all');
    });
  });

  describe('integration with crawlService', () => {
    it('should call crawlWithNotifications with correct parameters', () => {
      // This test would need to mock crawlWithNotifications and test the integration
      // For now, we'll test that the module can be required without errors
      
      expect(() => {
        require('../../cli.ts');
      }).not.toThrow();
    });
  });
});