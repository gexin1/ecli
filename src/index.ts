import { Command, Option as CommanderOption } from 'commander';
import { execaCommand } from 'execa';
import chalk from 'chalk';
import { fileURLToPath } from 'node:url';


const runExeca = async (cmds: string[], successMsg: string, errorMsg: string, action?: string) => {
  try {
    const promises = cmds.map((item) => execaCommand`${item}`);
    const result = await Promise.all(promises);
    result.forEach((item) => {
      if (item.stdout) {
        console.log(chalk.magenta(item.stdout));
      }
    });
    console.log(chalk.green(successMsg));
  } catch (error: any) {
    const msg = error?.shortMessage || error.message || '发生未知错误!!!';
    if (error.exitCode && action === 'info') {
      console.log(chalk.yellow('未配置'));
    } else {
      console.log(chalk.red(errorMsg));
      console.log(chalk.red(msg));
      // console.log(error);
    }
  }
};

const commands: Record<
  string,
  {
    set: (url: string) => string[];
    unset: () => string[];
    info: () => string[];
  }
> = {
  git: {
    set: (url) => [`git config --global http.proxy ${url}`, `git config --global https.proxy ${url}`],
    unset: () => [`git config --global --unset http.proxy`, `git config --global --unset https.proxy`],
    info: () => [`git config --global --get http.proxy`, `git config --global --get https.proxy`],
  },
  npm: {
    set: (url) => [`npm config set proxy ${url}`, `npm config set https-proxy ${url}`],
    unset: () => [`npm config delete proxy`, `npm config delete http-proxy`, `npm config delete https-proxy`],
    info: () => [`npm config get proxy`, `npm config get http-proxy`, `npm config get https-proxy`],
  },
  powershell: {
    set: (url) => [
      `powershell -NoProfile -Command "[Environment]::SetEnvironmentVariable('HTTP_PROXY', '${url}', 'User')"`,
      `powershell -NoProfile -Command "[Environment]::SetEnvironmentVariable('HTTPS_PROXY', '${url}', 'User')"`,
    ],
    unset: () => [
      `powershell -NoProfile -Command "[Environment]::SetEnvironmentVariable('HTTP_PROXY', $null, 'User')"`,
      `powershell -NoProfile -Command "[Environment]::SetEnvironmentVariable('HTTPS_PROXY', $null, 'User')"`,
    ],
    info: () => [
      `powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('HTTP_PROXY', 'User')"`,
      `powershell -NoProfile -Command "[Environment]::GetEnvironmentVariable('HTTPS_PROXY', 'User')"`,
    ],
  },
};

export async function run() {
  const defaultProxy = process.env.HTTP_PROXY || process.env.HTTPS_PROXY || 'http://127.0.0.1:7897';

  const program = new Command();
  program
    .description('A CLI tool to manage proxies')
    .addOption(new CommanderOption('-t, --type <type>', 'Type of the proxy').default('git').choices(['git', 'npm', 'powershell']))
    .addOption(new CommanderOption('-a, --action <char>', 'action').default('info').choices(['info', 'set', 'unset']))
    .addOption(new CommanderOption('-p, --proxy-url <url>', 'Proxy URL').default(defaultProxy));

  program.parse();
  const options = program.opts();

  const typeConfig = commands[options.type];
  if (!typeConfig) {
    console.warn('请选择正确的type类型!!!');
    return;
  }

  const action = options.action as 'set' | 'unset' | 'info';
  const proxyUrl = options.proxyUrl;

  let cmds: string[] = [];
  let successMsg = '';
  let errorMsg = '';

  switch (action) {
    case 'set':
      cmds = typeConfig.set(proxyUrl);
      successMsg = `设置${options.type}代理成功`;
      errorMsg = `设置${options.type}代理失败`;
      if (options.type === 'powershell') {
        successMsg += '\n注意：PowerShell 环境变量设置需要重启终端才能生效。';
      }
      break;
    case 'unset':
      cmds = typeConfig.unset();
      successMsg = `取消${options.type}代理成功`;
      errorMsg = `取消${options.type}代理失败`;
      if (options.type === 'powershell') {
        successMsg += '\n注意：PowerShell 环境变量设置需要重启终端才能生效。';
      }
      break;
    case 'info':
      cmds = typeConfig.info();
      successMsg = `展示${options.type}代理成功`;
      errorMsg = `展示${options.type}代理失败`;
      break;
  }

  await runExeca(cmds, successMsg, errorMsg, action);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  run();
}
