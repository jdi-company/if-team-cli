## [1.1.0](https://github.com/jdi-company/if-team-cli/compare/v1.0.0...v1.1.0) (2026-05-27)

### Features

* **task,auth:** add --assignee <id|me> to task list ([16c74dd](https://github.com/jdi-company/if-team-cli/commit/16c74dd38eeceb1efb041fb87fff826eeed2a558))

### Bug Fixes

* **auth:** resolve company-scoped participant id for --assignee me ([457422f](https://github.com/jdi-company/if-team-cli/commit/457422f4498da01e62335d302cd588a2430dda4d))
* **task:** correct finish_at/start_at filter shape for /tasks ([dc21a92](https://github.com/jdi-company/if-team-cli/commit/dc21a9282fc33ba9e17e472e80f8110603f484a1))
* **task:** use filter[project_id][] for --project, not project_id ([5d35510](https://github.com/jdi-company/if-team-cli/commit/5d355102e7eca1bb5ce8c72ad225d53a5781f6f4))

## 1.0.0 (2026-05-26)

### Features

* **auth:** --key without value prompts silently to avoid shell history ([0fd4369](https://github.com/jdi-company/if-team-cli/commit/0fd436968fa19268f6188b57a929941e7572667d))
* **auth:** IF_TEAM_COMPANY_ID env var + live token validation in auth status ([bb2752c](https://github.com/jdi-company/if-team-cli/commit/bb2752c6aa0251362a3a001f57912b83a6dbf89c))
* **auth:** implement dual-mode auth with OS keyring storage ([7fb3327](https://github.com/jdi-company/if-team-cli/commit/7fb33273f693cc64ef3871357fce68a2302291a9))
* **auth:** use temporary JWT to discover companies in API key login flow ([cfab1ba](https://github.com/jdi-company/if-team-cli/commit/cfab1bad846bdfdbcc0fd61c9f9a909afd10cee3))
* **iteration:** add read-only list/show/statuses commands ([8041e8d](https://github.com/jdi-company/if-team-cli/commit/8041e8d6392e7c1604787ad61724d42d28b29041))
* **project,task,iteration:** add create, update, and delete commands ([9e30eb8](https://github.com/jdi-company/if-team-cli/commit/9e30eb8f0150eb7911027de814eaeb196dd1ac6a))
* **project,task:** add read-only list/show/statuses commands ([2eb78ca](https://github.com/jdi-company/if-team-cli/commit/2eb78cac720fcd29861ec4b8c0a98201b6a2983f))
* scaffold TypeScript CLI with project structure, API spec, and docs ([8328dbc](https://github.com/jdi-company/if-team-cli/commit/8328dbc60b09f61854214b31a70827c59859f375))
* **skill,ci:** add agent skill installer and npm-publish pipeline ([2627301](https://github.com/jdi-company/if-team-cli/commit/262730160a5142dd51c3922c9d615a72e97fa50a))

### Bug Fixes

* **api,project,task,iteration:** polish create/update/delete from QA pass ([d1bec7e](https://github.com/jdi-company/if-team-cli/commit/d1bec7eb41949024b6a684b2121a5d7d3ed42225))
* **auth:** correct API key validation and document two-tier auth model ([e6858c2](https://github.com/jdi-company/if-team-cli/commit/e6858c204eea866c5e8ed4fd74b75e4c128071f5))
* **auth:** fix keychain, company fetch, and password paste ([b9d9939](https://github.com/jdi-company/if-team-cli/commit/b9d9939ce4dd2b9a384af2881701647abd68883c))
* **auth:** silent password prompt — enterprise standard ([eb33dec](https://github.com/jdi-company/if-team-cli/commit/eb33dec904e6d1f0d2431ce51bd51a5bd4cbb3f1))
