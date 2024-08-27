import { Command, Option as CommanderOption } from 'commander';
import { execa, execaCommand } from 'execa';
import chalk from 'chalk';
const log = console.log;
const program = new Command();
program
  .description('A CLI tool to manage proxies')
  .addOption(new CommanderOption('-t, --type <type>', 'Type of the proxy').default('git').choices(['git', 'npm']))
  .addOption(new CommanderOption('-a, --action <char>', 'action').default('info').choices(['info', 'set', 'unset']))
  .addOption(new CommanderOption('-p, --proxy-url <url>', 'Proxy URL').default('http://127.0.0.1:7897'));
program.parse();

const options = program.opts();
const runExeca = async (cmds: string[], successMsg: string, errorMsg: string, action?: string) => {
  try {
    const promises = cmds.map((item) => execaCommand`${item}`);
    const result = await Promise.all(promises);
    result.forEach((item) => {
      log(chalk.magenta(item.stdout || ''));
    });
    log(chalk.green(successMsg));
  } catch (error: any) {
    const msg = error?.shortMessage || error.message || '发生未知错误!!!';
    if (error.exitCode && action === 'info') {
      log(chalk.green('未配置'));
    } else {
      log(chalk.green(errorMsg));
      log(chalk.red(msg));
      log(error);
    }
  }
};

async function main() {
  if (options.type === 'git') {
    switch (options.action) {
      case 'set':
        await runExeca(
          [`git config --global http.proxy ${options.proxyUrl}`, `git config --global https.proxy ${options.proxyUrl}`],
          `设置${options.type}代理成功`,
          `设置${options.type}代理失败`,
        );
        break;
      case 'unset':
        await runExeca(
          [`git config --global --unset http.proxy`, `git config --global --unset https.proxy`],
          `取消${options.type}代理成功`,
          `取消${options.type}代理失败`,
        );
        break;
      case 'info':
        await runExeca(
          [`git config --global --get http.proxy`, `git config --global --get https.proxy`],
          `展示${options.type}代理成功`,
          `展示${options.type}代理失败`,
          'info',
        );
        break;
      default:
        break;
    }
  } else if (options.type === 'npm') {
    switch (options.action) {
      case 'set':
        await runExeca(
          [`npm config set proxy ${options.proxyUrl}`, `npm config set https-proxy ${options.proxyUrl}`],
          `设置${options.type}代理成功`,
          `设置${options.type}代理失败`,
        );
        break;
      case 'unset':
        await runExeca(
          [`npm config delete proxy`, `npm config delete http-proxy`, `npm config delete https-proxy`],
          `取消${options.type}代理成功`,
          `取消${options.type}代理失败`,
        );
        break;
      case 'info':
        await runExeca(
          [`npm config get proxy`, `npm config get http-proxy`, `npm config get https-proxy`],
          `展示${options.type}代理成功`,
          `展示${options.type}代理失败`,
          'info',
        );
        break;
      default:
        break;
    }
  } else {
    console.warn('请选择type类型!!!');
  }
}

(async () => {
  await main();
})();
