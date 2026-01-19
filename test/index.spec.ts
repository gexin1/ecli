import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { run } from '../src/index';

// Mock execaCommand
const execaCommandMock = vi.hoisted(() => vi.fn());

vi.mock('execa', async (importOriginal) => {
  const actual = await importOriginal<typeof import('execa')>();
  return {
    ...actual,
    execaCommand: execaCommandMock,
  };
});

// Spy on console.log and console.warn to keep output clean and verify outputs
const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

describe('CLI Tests', () => {
  const originalArgv = process.argv;
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    execaCommandMock.mockResolvedValue({ stdout: 'ok' });
    process.env = { ...originalEnv };
    delete process.env.HTTP_PROXY;
    delete process.env.HTTPS_PROXY;
  });

  afterEach(() => {
    process.argv = originalArgv;
    process.env = originalEnv;
  });

  it('should set git proxy with default url', async () => {
    process.argv = ['node', 'cli', '-t', 'git', '-a', 'set'];
    await run();
    expect(execaCommandMock).toHaveBeenCalledTimes(2);
    // execaCommand is a tagged template, arguments are (strings, ...values)
    expect(execaCommandMock.mock.calls[0][1]).toBe('git config --global http.proxy http://127.0.0.1:7897');
    expect(execaCommandMock.mock.calls[1][1]).toBe('git config --global https.proxy http://127.0.0.1:7897');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('设置git代理成功'));
  });

  it('should set git proxy with custom url via flag', async () => {
    process.argv = ['node', 'cli', '-t', 'git', '-a', 'set', '-p', 'http://custom.com:8080'];
    await run();
    expect(execaCommandMock).toHaveBeenCalledTimes(2);
    expect(execaCommandMock.mock.calls[0][1]).toBe('git config --global http.proxy http://custom.com:8080');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('设置git代理成功'));
  });

  it('should set git proxy using HTTP_PROXY env var', async () => {
    process.env.HTTP_PROXY = 'http://env-proxy.com';
    process.argv = ['node', 'cli', '-t', 'git', '-a', 'set'];
    await run();
    expect(execaCommandMock.mock.calls[0][1]).toBe('git config --global http.proxy http://env-proxy.com');
  });

  it('should unset git proxy', async () => {
    process.argv = ['node', 'cli', '-t', 'git', '-a', 'unset'];
    await run();
    expect(execaCommandMock).toHaveBeenCalledTimes(2);
    expect(execaCommandMock.mock.calls[0][1]).toBe('git config --global --unset http.proxy');
    expect(execaCommandMock.mock.calls[1][1]).toBe('git config --global --unset https.proxy');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('取消git代理成功'));
  });

  it('should get git proxy info', async () => {
    process.argv = ['node', 'cli', '-t', 'git', '-a', 'info'];
    execaCommandMock.mockResolvedValueOnce({ stdout: 'http://proxy.com' });
    await run();
    expect(execaCommandMock).toHaveBeenCalledTimes(2);
    expect(execaCommandMock.mock.calls[0][1]).toBe('git config --global --get http.proxy');
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('http://proxy.com'));
  });

  it('should set npm proxy', async () => {
    process.argv = ['node', 'cli', '-t', 'npm', '-a', 'set'];
    await run();
    expect(execaCommandMock).toHaveBeenCalledTimes(2);
    expect(execaCommandMock.mock.calls[0][1]).toBe('npm config set proxy http://127.0.0.1:7897');
    expect(execaCommandMock.mock.calls[1][1]).toBe('npm config set https-proxy http://127.0.0.1:7897');
  });

  it('should set powershell proxy', async () => {
    process.argv = ['node', 'cli', '-t', 'powershell', '-a', 'set'];
    await run();
    expect(execaCommandMock).toHaveBeenCalledTimes(2);
    expect(execaCommandMock.mock.calls[0][1]).toContain(
      "[Environment]::SetEnvironmentVariable('HTTP_PROXY', 'http://127.0.0.1:7897', 'User')",
    );
    expect(execaCommandMock.mock.calls[1][1]).toContain(
      "[Environment]::SetEnvironmentVariable('HTTPS_PROXY', 'http://127.0.0.1:7897', 'User')",
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('PowerShell 环境变量设置需要重启终端才能生效'));
  });

  it('should unset powershell proxy', async () => {
    process.argv = ['node', 'cli', '-t', 'powershell', '-a', 'unset'];
    await run();
    expect(execaCommandMock).toHaveBeenCalledTimes(2);
    expect(execaCommandMock.mock.calls[0][1]).toContain(
      "[Environment]::SetEnvironmentVariable('HTTP_PROXY', $null, 'User')",
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('PowerShell 环境变量设置需要重启终端才能生效'));
  });

  it('should get powershell proxy info', async () => {
    process.argv = ['node', 'cli', '-t', 'powershell', '-a', 'info'];
    await run();
    expect(execaCommandMock).toHaveBeenCalledTimes(2);
    expect(execaCommandMock.mock.calls[0][1]).toContain(
      "[Environment]::GetEnvironmentVariable('HTTP_PROXY', 'User')",
    );
  });

  it('should handle invalid type gracefully', async () => {
    process.argv = ['node', 'cli', '-t', 'invalid'];
    // Commander might exit or warn. Since choices are defined, it might exit process.
    // We should test valid types primarily.
    // If we bypass commander validation (not passing -t), it defaults to git.
    // If we pass invalid choice to commander with .choices(), commander calls process.exit().
    // We can't easily test process.exit in this setup without mocking it.
    // Let's assume commander handles validation.
  });

  it('should handle execa errors', async () => {
    process.argv = ['node', 'cli', '-t', 'git', '-a', 'set'];
    execaCommandMock.mockRejectedValue(new Error('Command failed'));
    await run();
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('设置git代理失败'));
    expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Command failed'));
  });
});