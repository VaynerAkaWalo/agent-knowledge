# Reviewing changes

Every agent reads every description at the start of every task and opens the facts that match, so a weak line costs every future task. Assume the change is wrong until you have challenged it from each view below. Treat the PR description, the author's verification and earlier reviews as claims to check, not evidence.

## Description

- Name real tasks that need the fact and check each would match, then name unrelated tasks that would wrongly match.
- Remove each clause in turn and ask which task stops matching. A clause no task needs is filler.
- Flag any rule, conclusion, exception or rare detail. Those belong in the body, and in the description they reach every conversation.
- Flag implementation names where a task would use other words, and overlap with another fact's description that leaves an agent unsure which to open.
- Check the body answers everything the description promises.

## Body

- Name the decision an agent faces when the fact applies and check the body answers it first, or says who decides.
- Remove each sentence in turn and ask what an agent would do differently. A sentence that changes nothing is filler.
- Each rule says what to do, why, and what to do when it doesn't fit. Flag lists of what not to do, since they cover only the mistakes the author thought of.
- A rule needs a source: the owner's words, a conversation or a doc. Flag a rule inferred from one app and observed state written as policy.
- Flag a fact that holds more than one decision, detail beyond what most tasks need, vague words that leave the agent to guess, and anything else AGENTS.md rules out.
- Check that the sources hold the details the fact compresses, so an agent that needs more knows where to read it. A fact without sources has to be one of the owner's own rules.

## Truth

Check each changed claim against its source on the default branch on origin, since local checkouts go stale. Compare every reworded claim with the version it replaces and flag qualifications that got lost or meanings that got broader, including cuts made to fit the length limit.

## Ripple and motivation

Look for other facts, skills, AGENTS.md or the README that the change contradicts or leaves stale, and for examples in untouched facts that no longer hold. For a change to the rules themselves, a request from the owner is reason enough. Otherwise ask which failure it fixes and what shows the new rule works, and when a rule keeps changing, ask what the last change got wrong.

## Report

Give each finding the file and line, a concrete scenario where an agent goes wrong because of it, and whether you verified it or suspect it. List what you checked under each section, so that nothing found can be told apart from not looked. Say ready only when every section is covered and nothing real is left.
