import { existsSync, readFileSync, statSync } from "node:fs"
import { dirname, join, resolve } from "node:path"

const findDotGit = (directory: string): string | undefined => {
  const candidate = join(directory, ".git")
  if (existsSync(candidate)) return candidate

  const parent = dirname(directory)
  return parent === directory ? undefined : findDotGit(parent)
}

const gitDirectory = (dotGit: string) => {
  if (statSync(dotGit).isDirectory()) return dotGit

  const pointer = readFileSync(dotGit, "utf8").match(/^gitdir:\s*(.+)$/m)
  return pointer ? resolve(dirname(dotGit), pointer[1].trim()) : undefined
}

const configPath = (gitDir: string) => {
  const commonDir = join(gitDir, "commondir")
  const root = existsSync(commonDir) ? resolve(gitDir, readFileSync(commonDir, "utf8").trim()) : gitDir

  return join(root, "config")
}

export const originUrl = (config: string) => {
  let inOrigin = false

  for (const line of config.split("\n")) {
    const section = line.match(/^\s*\[([^\]]+)\]/)
    if (section) {
      const [name, subsection] = section[1].trim().split(/\s+/, 2)
      inOrigin = name.toLowerCase() === "remote" && subsection === '"origin"'
      continue
    }

    const url = inOrigin ? line.match(/^\s*url\s*=\s*(?:"([^"]*)"|([^\s;#]+))/i) : undefined
    if (url) return url[1] ?? url[2]
  }

  return undefined
}

export const repoFromRemote = (url: string) => {
  const match = url.trim().match(/[/:]([^/:]+)\/([^/]+?)(\.git)?\/?$/)
  return match ? `${match[1]}/${match[2]}` : undefined
}

export const originRepo = (cwd: string) => {
  const dotGit = findDotGit(resolve(cwd))
  const gitDir = dotGit ? gitDirectory(dotGit) : undefined
  const config = gitDir ? configPath(gitDir) : undefined
  if (!config || !existsSync(config)) return undefined

  const url = originUrl(readFileSync(config, "utf8"))
  return url ? repoFromRemote(url) : undefined
}
