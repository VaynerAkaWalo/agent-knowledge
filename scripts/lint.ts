import { lintFacts } from "./facts.ts"

const results = await lintFacts()
const failures = results.filter(({ errors }) => errors.length)

for (const { file, errors } of failures) {
  for (const error of errors) console.error(`facts/${file}: ${error}`)
}

if (failures.length) process.exit(1)

console.log(`${results.length} facts ok`)
