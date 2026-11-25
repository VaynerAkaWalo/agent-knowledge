import { checkPresets, loadPresets } from "./presets.ts"
import { checkReferences, loadVault, repositoryRoot } from "./vault.ts"

export const lintRepository = async (root = repositoryRoot) => {
  const vault = await loadVault(root)
  const references = checkReferences(vault.documents)
  const presets = await loadPresets(root)

  const problems = [
    ...vault.problems,
    ...references.problems,
    ...presets.problems,
    ...checkPresets(presets.presets, new Set(references.bySlug.keys())),
  ]

  return { documents: vault.documents, presets: presets.presets, problems }
}

if (import.meta.main) {
  const { documents, problems } = await lintRepository()

  for (const { path, message } of problems) console.error(`${path}: ${message}`)
  if (problems.length) process.exit(1)

  console.log(`${documents.length} documents ok`)
}
