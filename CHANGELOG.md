# [1.23.0](https://github.com/governify/collector-events/compare/v1.22.3...v1.23.0) (2026-02-03)


### Bug Fixes

* correct label in endpoint jira query for issuesByAssigneeAndStatus ([3e344a5](https://github.com/governify/collector-events/commit/3e344a58582adfd0b3c710beaaff629cf23e03f9))
* correct label in endpoint query for closedIssuesByAssigneeAndStatus ([9e7a7ea](https://github.com/governify/collector-events/commit/9e7a7ea5bcb25c05e7331ecbd37add5500d10fdb))
* correct parameter passing in gitea getDataPaginated function ([ed8ffaf](https://github.com/governify/collector-events/commit/ed8ffafd3b20dd6d5e8b1872f4005664e184b95a))
* correct payloadDate values to 'undifined' in sourcesManager.json ([12773a2](https://github.com/governify/collector-events/commit/12773a283ad47dd100be371a92014aba07edf6f3))
* handle undefined subObject in getMatches function ([99b1124](https://github.com/governify/collector-events/commit/99b1124d6e402148cd9896e3bf6df23b3f3e874d))
* jira fetcher ([432fdf2](https://github.com/governify/collector-events/commit/432fdf2949a31349342c8c6db649a6a659a5efbc))
* step paginatorConfig ([6861260](https://github.com/governify/collector-events/commit/68612606cf17cf3ac725d60cd1fa8917f6d83b4d))
* update endpoint type check for 'PRs' in giteaFetcher ([e37a32a](https://github.com/governify/collector-events/commit/e37a32a79e6e0b5e698e7c6a56c534f7f762ec95))
* update gql-paginator to version 2.6.0 and enhance query resolution in githubGQLFetcher ([bff7206](https://github.com/governify/collector-events/commit/bff7206e22512bab65ade8a61825f628d306afcf))
* update gql-paginator to version 2.6.1 ([63b39ce](https://github.com/governify/collector-events/commit/63b39cef4ea0b2ea92f65eb7fbe9572a2efd35d1))
* update payloadDate values to 'statusName' in sourcesManager.json ([9a2af29](https://github.com/governify/collector-events/commit/9a2af294d38d1ead325f4582be3da0024b75bb6d))


### Features

* add Gitea integration with fetcher and configuration updates ([e50fa07](https://github.com/governify/collector-events/commit/e50fa07a5659ac5171682ab3dcb16411bff2752b))
* add logging for event type and endpoint type ([41d2b38](https://github.com/governify/collector-events/commit/41d2b389df301c39c72ff02a32267e5f6cf2c049))
* add new 'PR' endpoint to Gitea fetcher ([a32056d](https://github.com/governify/collector-events/commit/a32056dd0ac761ed31cc91dcf9a80d1ac37d6cf4))
* enhance Jira and Gitea fetchers with pagination optimizations ([9c13c1b](https://github.com/governify/collector-events/commit/9c13c1bc4940b94f6ffdf46bf0b0684b12d0d1b8))
* enhance Jira fetcher with new endpoints for issue filtering by assignee and status ([ebfccd7](https://github.com/governify/collector-events/commit/ebfccd7c47b580cb147a1f6ee64766a7e3a26f66))
* fetcher options refactor ([75b7432](https://github.com/governify/collector-events/commit/75b7432d64fcfe1a62a79b8ca868a3df48802603))
* fetcher refactor ([c397644](https://github.com/governify/collector-events/commit/c397644bd2a2f1f0f0467e4279645b167caccd31))
* gitea implement 'allBranches' endpoint ([494b82e](https://github.com/governify/collector-events/commit/494b82e43ab8e43c84ffcd153b06297c90d248ef))
* githubGQLFetcher pagination data ([851b68a](https://github.com/governify/collector-events/commit/851b68a5894e6d99e3da8f814c59d71ba88699b1))
* refactor authKeys to support multiple keys and improve token retrieval ([087cddb](https://github.com/governify/collector-events/commit/087cddbe8144eef0236ea942fd1351515fea4963))
* update Gitea fetcher to support pagination ([176a824](https://github.com/governify/collector-events/commit/176a8246ae120977c1842a1c5f9b0de8b6670650))
* zenhub fetcher ([7e81398](https://github.com/governify/collector-events/commit/7e8139883d499cb86a9311eb07d1907183265d90))



## [1.22.3](https://github.com/governify/collector-events/compare/v1.22.2...v1.22.3) (2024-10-07)


### Bug Fixes

* fetcher utils cache ([836b1d4](https://github.com/governify/collector-events/commit/836b1d4a694014ab9cd8145e191ce9ae3b6237fa))
* fetcher utils cache ([4fececc](https://github.com/governify/collector-events/commit/4fececcdc211f3907b58d09a051595386183cda6))



## [1.22.2](https://github.com/governify/collector-events/compare/v1.22.1...v1.22.2) (2024-10-07)


### Bug Fixes

* github fetcher ([6440139](https://github.com/governify/collector-events/commit/6440139e02e2d027ea4642c71b4b59df6002bc0d))
* github fetcher ([3a19f34](https://github.com/governify/collector-events/commit/3a19f34de96da04e9d61173d09929df87710722e))



## [1.22.1](https://github.com/governify/collector-events/compare/v1.22.0...v1.22.1) (2024-10-06)


### Bug Fixes

* githubFetcher cache ([5ffc990](https://github.com/governify/collector-events/commit/5ffc9901a06ea5268a9c2bcd0352b0f8f5e4be3c))



# [1.22.0](https://github.com/governify/collector-events/compare/v1.21.0...v1.22.0) (2024-09-30)


### Bug Fixes

* dockerfile ([2fc9369](https://github.com/governify/collector-events/commit/2fc936949424cb696397ab2994869746eb74062d))
* gh actions comment ([ed18722](https://github.com/governify/collector-events/commit/ed187221ab63a4438773eca957d727956b63e8ed))
* github actions ([cf9cc90](https://github.com/governify/collector-events/commit/cf9cc90655883f4ac069a8c2884f0d8c74210b08))
* node docker version ([8574046](https://github.com/governify/collector-events/commit/8574046e137852067943a83427b433daecb74a54))
* node version ([d41d5ca](https://github.com/governify/collector-events/commit/d41d5cab14758c915a90901e9735e86ad7efe98f))
* package ([cc15971](https://github.com/governify/collector-events/commit/cc15971fec34469cb03f58ab42233db0487cbac3))
* package ([46a43e4](https://github.com/governify/collector-events/commit/46a43e4eac37699f122b5398f3edc54edb26e2f4))
* package lock ([d4d0a6f](https://github.com/governify/collector-events/commit/d4d0a6f39fb7f558ff5ea1b51699153e2798a81e))
* package version ([9d7ccc4](https://github.com/governify/collector-events/commit/9d7ccc4cb6b3c00d281d7edbcb5c2b8e956ebf13))
* package-lock ([e0c9d19](https://github.com/governify/collector-events/commit/e0c9d19d4040f0ad72929a08c4b1333a57fc5792))
* package-lock ([4676f8b](https://github.com/governify/collector-events/commit/4676f8bfb7273ff801dcbbfd7727023412e5f47a))
* package-lock ([f9bf1a8](https://github.com/governify/collector-events/commit/f9bf1a8639e48e86ad5dfc86cf3b3c3db3c8472c))
* packagees ([ecf89d4](https://github.com/governify/collector-events/commit/ecf89d4c9b041f3a5475e5f0f18f50b83d9345e0))


### Features

* gql-paginator in githubGQLFetcher ([440c1c4](https://github.com/governify/collector-events/commit/440c1c41784741c13b29b86ddf614ef3eeeb168f))
* node version warning on github actions ([cf734c2](https://github.com/governify/collector-events/commit/cf734c2feb72f861f8a5c04a73d10a3b170bdce4))



# [1.21.0](https://github.com/governify/collector-events/compare/v1.20.0...v1.21.0) (2024-07-12)


### Bug Fixes

* lint ([5f96d2c](https://github.com/governify/collector-events/commit/5f96d2cbc2588a712dc414bbcdaeb4ca71519ebe))
* more information readme ([c2ce59c](https://github.com/governify/collector-events/commit/c2ce59c0ec8434aedc14de3c15b2475c4b37bc98))
* oas-file summary and responses ([0d92c27](https://github.com/governify/collector-events/commit/0d92c27c292a005fc33b17ec8fa61ef78b436fd5))
* package-lock using node v14.21.3 ([578be1b](https://github.com/governify/collector-events/commit/578be1b88221b30ccac3fca2afe318f6ffeaed09))
* tests after oas-telemetry changes ([50861d7](https://github.com/governify/collector-events/commit/50861d734ae65ec78dc19b2f9785aa2e20d8925c))
* Update README.md ([02a4cce](https://github.com/governify/collector-events/commit/02a4cce1ed77c0e5a28f1c71ecdc77156452a3b2))
* Update README.md ([a7bb738](https://github.com/governify/collector-events/commit/a7bb73870515a4bba994188570dcbb824d863a81))


### Features

* env.example ([fe48e12](https://github.com/governify/collector-events/commit/fe48e1263db2b91ddc82100319e443ba9a7a2d90))
* oas-tools/oas-telemetry ([44e76bd](https://github.com/governify/collector-events/commit/44e76bd0894ed7b7c4434a9037238547fff07915))



# [1.20.0](https://github.com/governify/collector-events/compare/v1.19.1...v1.20.0) (2023-10-19)


### Bug Fixes

* removed New relic from package.json ([e194901](https://github.com/governify/collector-events/commit/e19490107e5b5e4f748d6fb19188bfc08488613e))


### Features

* added cors ([370aa14](https://github.com/governify/collector-events/commit/370aa14c6a4b559de89bbea26404f18a3fb11a6b))



## [1.19.1](https://github.com/governify/collector-events/compare/v1.19.0...v1.19.1) (2023-07-28)


### Bug Fixes

* fixed typo in fetcherUtils ([a964ed7](https://github.com/governify/collector-events/commit/a964ed70f2596bd0a846c8406c857167a0fe3dad))



# [1.19.0](https://github.com/governify/collector-events/compare/v1.18.0...v1.19.0) (2023-07-17)


### Bug Fixes

* Commented CI e2e tests due to dates change ([2ad4e31](https://github.com/governify/collector-events/commit/2ad4e31242117c158f07ede17620e4ffd17a5825))
* fix for package files ([46eb462](https://github.com/governify/collector-events/commit/46eb462a0d92cf72211b6beb0671ead005c9899b))
* Fixed bug with cache writting ([c678a8b](https://github.com/governify/collector-events/commit/c678a8b2ecd06014f81f48ab44d0c5f59903017d))
* governify commons v1,19.0 ([bcadaba](https://github.com/governify/collector-events/commit/bcadaba46f9a8dda84d04506b65647e8a695c96a))
* merging versions from different branches ([4faa2e4](https://github.com/governify/collector-events/commit/4faa2e4aa268bbdfd9997b3c3eb7a384fda21f1d))


### Features

* added more logging to GQL fetcher ([471d2e6](https://github.com/governify/collector-events/commit/471d2e66f225a6cecc37c64a43f3ab18e07770a0))
* Fixed calculation for periods ([db7210f](https://github.com/governify/collector-events/commit/db7210f57683def112bd8fd1400ddb4955646dfd))



# [1.18.0](https://github.com/governify/collector-events/compare/v1.17.0...v1.18.0) (2023-06-20)


### Features

* added support for window option in custom events ([88fe11d](https://github.com/governify/collector-events/commit/88fe11d450bd023f1e29793518963cdc4e0b2cdb))



# [1.17.0](https://github.com/governify/collector-events/compare/v1.16.2...v1.17.0) (2023-06-01)


### Bug Fixes

* Added the previous fix to the cached case ([c2682ed](https://github.com/governify/collector-events/commit/c2682ed52cb911a0a1b3ca392a28844136513298))
* Workaround for GitHub's REST API's hard limit ([173311a](https://github.com/governify/collector-events/commit/173311a147afe69e365de073cfe03d9927fdeddc))


### Features

* Added member replacement for runScript and added new endpoint ([897463a](https://github.com/governify/collector-events/commit/897463a3abdd0a37cd39bce5d061e61272e98286))



## [1.16.2](https://github.com/governify/collector-events/compare/v1.16.1...v1.16.2) (2023-05-10)



## [1.16.1](https://github.com/governify/collector-events/compare/v1.16.0...v1.16.1) (2023-05-06)



# [1.16.0](https://github.com/governify/collector-events/compare/v1.15.0...v1.16.0) (2023-03-26)


### Features

* Added customizable logs for GHGQL and fixed bug in GH fetcher ([88b0698](https://github.com/governify/collector-events/commit/88b0698fec147e2d33d175c912fb257e32e4e3dc))



# [1.15.0](https://github.com/governify/collector-events/compare/v1.14.0...v1.15.0) (2023-02-12)


### Features

* Installed newrelic ([cefa31a](https://github.com/governify/collector-events/commit/cefa31a68d8f5b3a8a18410054aa18af4b5e8e88))



# [1.14.0](https://github.com/governify/collector-events/compare/v1.13.0...v1.14.0) (2023-02-09)


### Features

* Implemented stories for PT and few periodLenghts ([0cf4ff2](https://github.com/governify/collector-events/commit/0cf4ff28002aa8e5ef5c5400e1334d5dee226aca))



# [1.13.0](https://github.com/governify/collector-events/compare/v1.12.0...v1.13.0) (2022-12-11)


### Features

* Added more functionality to Redmine and Gitlab fetchers ([2af8940](https://github.com/governify/collector-events/commit/2af8940f748d8bb45fb1a09f0920e7d16b88201b))
* Added support for Jira ([743d751](https://github.com/governify/collector-events/commit/743d751bddcabddd8b3d591db8fe01b2cce1ccfe))



# [1.12.0](https://github.com/governify/collector-events/compare/v1.11.0...v1.12.0) (2022-11-17)


### Features

* Added endpoints to the sourcesManager.json ([1045329](https://github.com/governify/collector-events/commit/1045329b47bca14ba8126f9e9892635134dd17f3))
* Redmine and Gitlab fetchers working ([a01be9c](https://github.com/governify/collector-events/commit/a01be9c1e6882c54a0903771ad4dbe97904aa736))



# [1.11.0](https://github.com/governify/collector-events/compare/v1.10.0...v1.11.0) (2022-02-01)


### Features

* GithubCI fetcher ([1d12616](https://github.com/governify/collector-events/commit/1d126164ae997ef8697c5eb6de86c4818fcdf385))



# [1.10.0](https://github.com/governify/collector-events/compare/v1.9.0...v1.10.0) (2021-10-28)


### Features

* gitlab ([821350a](https://github.com/governify/collector-events/commit/821350ae18304afd9b4a5c2c69de2db7a146b42a))



# [1.9.0](https://github.com/governify/collector-events/compare/v1.8.2...v1.9.0) (2021-07-23)


### Bug Fixes

* commons middleware ([0eb49d6](https://github.com/governify/collector-events/commit/0eb49d6b89e164c95614afd376259c66e97797f8))
* package.json name ([f98c70d](https://github.com/governify/collector-events/commit/f98c70d21d356ca3cb022a7079b82171f0238d2c))
* rm collectors from external infrastructure ([f3b9c36](https://github.com/governify/collector-events/commit/f3b9c36cc0a35086a84a222ca45a8e0636591606))
* stub console ([d1fcd72](https://github.com/governify/collector-events/commit/d1fcd72e1c3212399d18ecb049d1b00d61f709df))


### Features

* commons logger ([66c19a6](https://github.com/governify/collector-events/commit/66c19a6c3e7379b127a5b97f22e56703ac3a1424))
* E2E assets to develop ([ab7f187](https://github.com/governify/collector-events/commit/ab7f18726fd7f371960f2bfaee1f6c6b03780ad0))
* runScript pipe ([abc2e97](https://github.com/governify/collector-events/commit/abc2e97d9a81f497f4d3b8a00b9c6fe8ac38a753))
* update commons v1.14 ([f77c872](https://github.com/governify/collector-events/commit/f77c8724384164ad8d4fa7921bef857ac11a34a9))



## [1.8.2](https://github.com/governify/collector-events/compare/v1.8.1...v1.8.2) (2021-07-19)



## [1.8.1](https://github.com/governify/collector-events/compare/v1.8.0...v1.8.1) (2021-07-19)



# [1.8.0](https://github.com/governify/collector-events/compare/v1.7.0...v1.8.0) (2021-05-07)


### Bug Fixes

* binding on both main and related ([637f569](https://github.com/governify/collector-events/commit/637f56984838af988048b2a9febc466ea62d00ca))
* e2e pipeline ([fc68b64](https://github.com/governify/collector-events/commit/fc68b64b48eb4540dba746a52c27902cf2176438))
* github authorization ([93f9ca5](https://github.com/governify/collector-events/commit/93f9ca59b0018e1aa03761a583e63b912d6f9bd6))
* lint ([6abf092](https://github.com/governify/collector-events/commit/6abf092e3dcf5c9c98319733203d282129158eb3))
* mockups ([9f2e90a](https://github.com/governify/collector-events/commit/9f2e90a9b6e5477174302f5992a2ae0a9c1910c4))
* POST requests temporal cache ([5eac955](https://github.com/governify/collector-events/commit/5eac95527e3beb7d275ad59bfeaacb497c3213f6))
* problem with dates (custom) ([dda7e56](https://github.com/governify/collector-events/commit/dda7e5607b53473e58f88b926634e875b8769a7c))
* removed console.logs ([07af43a](https://github.com/governify/collector-events/commit/07af43aa92175d85b46497b1c1da30e32385c5ce))
* scope manager key ([4450971](https://github.com/governify/collector-events/commit/445097120c63090a782e1d0b5851b2b9920db620))
* travis public-private apikey ([736970e](https://github.com/governify/collector-events/commit/736970e34b25e038e8dcb7e0939add9daa43a23e))


### Features

* cache with redis working ([9453d51](https://github.com/governify/collector-events/commit/9453d510eb43d152998e67f0e1942107a4ce21e7))
* commons middleware and db ([fa39529](https://github.com/governify/collector-events/commit/fa395293e7d47c47595bbb05071411aaf43ed63e))
* generalized for steps ([1cb70f1](https://github.com/governify/collector-events/commit/1cb70f1ae629bdeb37e26285a4785ad6e29a8b27))
* generalized repo owner name and docs ([49c633a](https://github.com/governify/collector-events/commit/49c633a008af805f40df02bd8d26d9248166e691))
* github-graphql test ([3552793](https://github.com/governify/collector-events/commit/355279351a8d700a38903b4c075bddf6b11a32e2))
* governify-commons requests substituted ([a9ea461](https://github.com/governify/collector-events/commit/a9ea461699d63c70a45a70aaedb62ab8d0162ad6))
* new infrastructure port (5500) ([1da0bb2](https://github.com/governify/collector-events/commit/1da0bb24389d5c8c3426e5e315860773edb3039a))
* query to string ([c5298c4](https://github.com/governify/collector-events/commit/c5298c4604909e716a9f2bae42a36983d688f2fe))
* redis on tests ([7f841da](https://github.com/governify/collector-events/commit/7f841dac5e20361a23c0928a5fdd53ea6232e483))
* simplified recursion call ([02cfc20](https://github.com/governify/collector-events/commit/02cfc20c51e0978330c59bcc70252fc6e9d6066d))
* simplified request method ([80f6f21](https://github.com/governify/collector-events/commit/80f6f211a0573b6cce6044810e3f2d6c6b980589))
* step filtering ([be8c697](https://github.com/governify/collector-events/commit/be8c697a7de12e64ea13e01a262fd02bd1459c82))
* update commons ([c6018d3](https://github.com/governify/collector-events/commit/c6018d3c56e3dfd50a5af9e4b89214498b79fbff))
* updated governify-commons ([fba6b88](https://github.com/governify/collector-events/commit/fba6b88e105d0eca65c22c65881f8f92e06ee259))
* upgrade commons ([5627649](https://github.com/governify/collector-events/commit/56276497c773f2e252517c829aa53e14e2584547))



# [1.7.0](https://github.com/governify/collector-events/compare/v1.6.0...v1.7.0) (2021-02-25)


### Bug Fixes

* [ ] computations errors ([d89729d](https://github.com/governify/collector-events/commit/d89729d039900d9d65406a73f8c69e924ed4b9db))
* cache ([d5e3397](https://github.com/governify/collector-events/commit/d5e3397af7cccc00406b2088092f4932bff70167))
* lint and updated dependencies ([87727c2](https://github.com/governify/collector-events/commit/87727c2872241cd03c1916b7b1aa07a56773d4d6))
* unhandled rejections ([39eb9d6](https://github.com/governify/collector-events/commit/39eb9d61ff984dec514d2be4d91739013875b41b))


### Features

* add member filtering ([d2b3017](https://github.com/governify/collector-events/commit/d2b30172e3a5afab518f86af0b597d1d4981bbf1))
* CC negative tests ([51cf5ad](https://github.com/governify/collector-events/commit/51cf5ad9ef2699d76979b57dfd0f48d78299e89d))
* heroku tests ([ab0e3ea](https://github.com/governify/collector-events/commit/ab0e3eaf96d353a6853c929aef29a59de88cfc46))
* negative tests ([37121f9](https://github.com/governify/collector-events/commit/37121f9231f2659496430d173beb04c1298ea398))
* pivotal, github control ([8dbf979](https://github.com/governify/collector-events/commit/8dbf97901469efa87070f0c53133382e5e682276))
* request changed with axios ([9a80b3f](https://github.com/governify/collector-events/commit/9a80b3f35ce6f97e2334d3b41b08d685a5093a63))
* travis negative tests ([a142f7c](https://github.com/governify/collector-events/commit/a142f7cfb365f1be7e34a42759245613de06d764))



# [1.6.0](https://github.com/governify/collector-events/compare/v1.5.2...v1.6.0) (2021-01-19)


### Bug Fixes

* nock ([7c50ce2](https://github.com/governify/collector-events/commit/7c50ce2aa3ab3eb73aa87fbc738b7199271521b0))
* nock controller in image ([6e85049](https://github.com/governify/collector-events/commit/6e850491744e2977c26cec86f9a8ca566a15abc9))
* nockMockupsE2E ([f3b3553](https://github.com/governify/collector-events/commit/f3b35537c8e1e46c4abc26f8e20fe9db86e8dd9b))
* removed json cause it is given by volume ([4c67f51](https://github.com/governify/collector-events/commit/4c67f518c5f6f91f95d4f31e9f4d1d39de1210c7))
* reordered flow ([09006a4](https://github.com/governify/collector-events/commit/09006a4681cfb524ef73344431f10a8df3befa24))
* sm url in e2e mockups ([bd26242](https://github.com/governify/collector-events/commit/bd2624258727d4eeb494631c84ef9716774e1edc))
* workflow descriptions ([7d863c9](https://github.com/governify/collector-events/commit/7d863c932166959f5d94e611041ec09b313a0e07))


### Features

* e2e testing ([f8ea222](https://github.com/governify/collector-events/commit/f8ea22215cfe5ed4512c9b7df1e2a4364ad2aeaa))



## [1.5.2](https://github.com/governify/collector-events/compare/v1.5.1...v1.5.2) (2021-01-14)


### Bug Fixes

* dockerfile ([1f2dd83](https://github.com/governify/collector-events/commit/1f2dd8338d64fcf5817d959125ea9fc64e7c66f2))



## [1.5.1](https://github.com/governify/collector-events/compare/v1.5.0...v1.5.1) (2021-01-14)


### Bug Fixes

* cleaning before building ([963b0af](https://github.com/governify/collector-events/commit/963b0af2bf4121c9ccff91639f7c7b44f9a698b6))



# [1.5.0](https://github.com/governify/collector-events/compare/654e676c7652e6e1b6821bbb5f7343d49d5e17af...v1.5.0) (2021-01-14)


### Features

* CI/CD, updated badges, .dockerignore ([afc7e36](https://github.com/governify/collector-events/commit/afc7e36a882908c7ab8cb111a9df3aedd57ec6cc))
* coveralls ([f50f766](https://github.com/governify/collector-events/commit/f50f766dad367034dc73e947102a36ee7c8d9202))
* initial commit ([654e676](https://github.com/governify/collector-events/commit/654e676c7652e6e1b6821bbb5f7343d49d5e17af))
* new docker image in use ([0ca7098](https://github.com/governify/collector-events/commit/0ca7098273414e7d2ab8ce86bed6db31ca3d5966))
* package author, repository and docker ([f3103a9](https://github.com/governify/collector-events/commit/f3103a98d99027ae1daf7e5eb6abe8a614e51c0a))
* releasing and pushing ([52e93b5](https://github.com/governify/collector-events/commit/52e93b588ff17f5d0d524905cace665adeccd03d))



