const { sequelize } = require('./entity');
const { resetAccountPassword } = require('./accountProvisioning');

function option(name) {
  const prefix = `--${name}=`;
  const match = process.argv.slice(2).find((argument) => argument.startsWith(prefix));
  return match ? match.slice(prefix.length) : undefined;
}

function prompt(label, { hidden = false } = {}) {
  if (!process.stdin.isTTY || typeof process.stdin.setRawMode !== 'function') {
    return Promise.reject(new Error('Run this command in a terminal.'));
  }
  return new Promise((resolve, reject) => {
    let value = '';
    process.stdout.write(label);
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();
    const finish = (error) => {
      process.stdin.off('data', onData);
      process.stdin.setRawMode(false);
      process.stdout.write('\n');
      if (error) reject(error);
      else resolve(value);
    };
    const onData = (chunk) => {
      for (const character of chunk) {
        if (character === '\u0003') return finish(new Error('Cancelled.'));
        if (character === '\r' || character === '\n') return finish();
        if (character === '\u007f' || character === '\b') {
          value = value.slice(0, -1);
          if (!hidden) process.stdout.write('\b \b');
        } else {
          value += character;
          if (!hidden) process.stdout.write(character);
        }
      }
    };
    process.stdin.on('data', onData);
  });
}

async function main() {
  const username = option('username');
  if (!username) throw new Error('Add --username=USER_ID. Do not add a password to the command.');
  const roleName = option('role');
  process.stdout.write(`Target user ID: ${username}\n`);
  const confirmation = await prompt(`Type RESET ${username} to confirm: `);
  if (confirmation !== `RESET ${username}`) throw new Error('The user ID confirmation did not match.');
  const password = await prompt('New password: ', { hidden: true });
  const repeated = await prompt('Repeat new password: ', { hidden: true });
  if (password !== repeated) throw new Error('The passwords do not match.');

  await sequelize.authenticate();
  const result = await resetAccountPassword({ username, password, ...(roleName ? { roleName } : {}) });
  process.stdout.write(`Password reset for account ${result.id} (${result.username}); role ${result.role}; old sessions revoked.\n`);
}

main().catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exitCode = 1;
}).finally(async () => {
  await sequelize.close();
});
