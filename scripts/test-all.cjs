const { runCommand } = require('./test-utils.cjs');

let failed = false;

try {
  runCommand('npm', ['run', 'test:setup']);
  runCommand('npm', ['run', 'test:unit:api']);
  runCommand('npm', ['run', 'test:int:api']);
  runCommand('npm', ['run', 'test:e2e']);
} catch (error) {
  failed = true;
  console.error(error instanceof Error ? error.message : error);
} finally {
  try {
    runCommand('npm', ['run', 'test:teardown']);
  } catch (error) {
    failed = true;
    console.error(error instanceof Error ? error.message : error);
  }
}

process.exit(failed ? 1 : 0);