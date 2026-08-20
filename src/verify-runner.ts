import { runRegressionChecks } from './engine/verify';

const results = runRegressionChecks();
for (const line of results) {
  console.log(`✓ ${line}`);
}
console.log(`\n${results.length} checks passed.`);
