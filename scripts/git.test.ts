import { expect, test } from "bun:test"
import { originUrl, repoFromRemote } from "./git.ts"

test("reads owner/repo from https and ssh remotes", () => {
  expect(repoFromRemote("https://github.com/Example-Org/shop.git")).toBe("Example-Org/shop")
  expect(repoFromRemote("https://github.com/Example-Org/shop")).toBe("Example-Org/shop")
  expect(repoFromRemote("git@github.com:Example-Org/shop.git")).toBe("Example-Org/shop")
  expect(repoFromRemote("ssh://git@github.com/Example-Org/my.repo.git")).toBe("Example-Org/my.repo")
})

test("reads the origin url from a git config and ignores other remotes", () => {
  const config = '[remote "upstream"]\n\turl = https://github.com/a/b.git\n[remote "origin"]\n\turl = git@github.com:c/d.git\n'

  expect(originUrl(config)).toBe("git@github.com:c/d.git")
  expect(originUrl('[remote "upstream"]\n\turl = https://github.com/a/b.git\n')).toBeUndefined()
  expect(originUrl('[remote "origin"] # main\n\turl = "git@github.com:c/d.git" ; quoted\n')).toBe("git@github.com:c/d.git")
  expect(originUrl('[remote "origin"]\n\turl = git@github.com:c/d.git # note\n')).toBe("git@github.com:c/d.git")
  expect(originUrl('[Remote "origin"]\n\tURL = git@github.com:c/d.git\n')).toBe("git@github.com:c/d.git")
  expect(originUrl('[remote "Origin"]\n\turl = git@github.com:c/d.git\n')).toBeUndefined()
})
