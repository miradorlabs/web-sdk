# Changelog

## [2.4.0](https://github.com/miradorlabs/web-sdk/compare/v2.3.0...v2.4.0) (2026-06-02)


### Features

* **chains:** add canton network tx hint ([#89](https://github.com/miradorlabs/web-sdk/issues/89)) ([9fecc4e](https://github.com/miradorlabs/web-sdk/commit/9fecc4e9e3cd300940ff7b8d4a50fe5ccea24821))

## [2.3.0](https://github.com/miradorlabs/web-sdk/compare/v2.2.2...v2.3.0) (2026-05-29)


### Features

* **chains:** add solana tx support and hyperevm chain support ([34354bd](https://github.com/miradorlabs/web-sdk/commit/34354bd01e4b0dfbb1a8c961734765bb4159f8d7))
* **chains:** add solana tx support and hyperevm chain support ([282685b](https://github.com/miradorlabs/web-sdk/commit/282685ba9eb721f661665cfd7e2881f4767cff9a))

## [2.2.2](https://github.com/miradorlabs/web-sdk/compare/v2.2.1...v2.2.2) (2026-05-22)


### Bug Fixes

* bundle grpc-web proto stubs into the SDK output ([f745a38](https://github.com/miradorlabs/web-sdk/commit/f745a38e943222f4dd55a2d98dcba38c5bd5c1ba))
* bundle grpc-web proto stubs into the SDK output ([30c6709](https://github.com/miradorlabs/web-sdk/commit/30c67099babe0e1877f7c029c5fa2cd7d4f8a911))

## [2.2.1](https://github.com/miradorlabs/web-sdk/compare/v2.2.0...v2.2.1) (2026-05-21)


### Bug Fixes

* restore package.json exports field for module resolution ([bb36082](https://github.com/miradorlabs/web-sdk/commit/bb360823449cde3eba308cede37fa15771bd7e4d))
* restore package.json exports field for module resolution ([0e17bbf](https://github.com/miradorlabs/web-sdk/commit/0e17bbfde6f4689bc8b13a198791e2b49e109b1c))

## [2.2.0](https://github.com/miradorlabs/web-sdk/compare/v2.1.0...v2.2.0) (2026-05-20)


### Features

* **relay:** add relay bridge plugin functionality to web-sdk ([e289207](https://github.com/miradorlabs/web-sdk/commit/e2892072a567508f9ff0f741aa9dab9688845221))
* **relay:** add relay bridge plugin functionality to web-sdk ([8921bae](https://github.com/miradorlabs/web-sdk/commit/8921baecdfe98529be42dfabecfb572761bc2ea2))

## [2.1.0](https://github.com/miradorlabs/web-sdk/compare/v2.0.2...v2.1.0) (2026-05-11)


### Features

* add functionality to capture wallet information ([9ab4b22](https://github.com/miradorlabs/web-sdk/commit/9ab4b220c886df13cbf55a4a18050c8f07924562))
* add functionality to capture wallet information ([7e41ccc](https://github.com/miradorlabs/web-sdk/commit/7e41cccc1f8311d2b40684e2287c5109b8895646))

## [2.0.2](https://github.com/miradorlabs/web-sdk/compare/v2.0.1...v2.0.2) (2026-04-29)


### Bug Fixes

* adds release ([f130ff0](https://github.com/miradorlabs/web-sdk/commit/f130ff0f9b4d3be07dcf291284860ba6967e05b4))
* adds release ([6e72fe1](https://github.com/miradorlabs/web-sdk/commit/6e72fe1b2a138c22e153ce734f1d622e604365a0))

## [2.0.1](https://github.com/miradorlabs/web-sdk/compare/v2.0.0...v2.0.1) (2026-04-20)


### Bug Fixes

* use beforeunload instead of visibilitychange event listener ([16b1dd4](https://github.com/miradorlabs/web-sdk/commit/16b1dd403b42848e6307f8784996ba19a5d3130a))
* use beforeunload instead of visibilitychange event listener ([45f2896](https://github.com/miradorlabs/web-sdk/commit/45f2896d6a7df220ff3d94d718dc5297f358b8ce))

## [2.0.0](https://github.com/miradorlabs/web-sdk/compare/v1.6.0...v2.0.0) (2026-03-20)


### ⚠ BREAKING CHANGES

* removes setTraceId() method
* trace id generation at creation, setTraceId no longer guards against overwriting

### Features

* add plugin system to web sdk ([d438a63](https://github.com/miradorlabs/web-sdk/commit/d438a63144bcad5a3518686fb99a058e152aced5))
* add plugin system to web sdk ([877f411](https://github.com/miradorlabs/web-sdk/commit/877f41155803f65e54aa4262250d9aece53b11bc))
* add resilience to web-sdk ([379a4fa](https://github.com/miradorlabs/web-sdk/commit/379a4fa3df62b2160de6ee70ad612bcee69fc660))
* add resilience to web-sdk ([9ae03fb](https://github.com/miradorlabs/web-sdk/commit/9ae03fb259ddbb701d5f8bd44e4f50e49345f4f5))
* addresses breaking changes ([f7ab736](https://github.com/miradorlabs/web-sdk/commit/f7ab73689eeae8227ad2c73ef1a9b9e6c40aa56a))
* replace CreateTrace/UpdateTrace with idempotent FlushTrace RPC ([2decc38](https://github.com/miradorlabs/web-sdk/commit/2decc38d3b99188d5bb69eabed676acef7073e20))
* replace CreateTrace/UpdateTrace with idempotent FlushTrace RPC ([6bde39d](https://github.com/miradorlabs/web-sdk/commit/6bde39d06a0aa8f04a76ea256dd5457744b05c0d))
* update naming convention ([4de65f7](https://github.com/miradorlabs/web-sdk/commit/4de65f70928592ec05c19afee754c897126500e2))
* update use case for plugin functionality, and update tests ([235bc05](https://github.com/miradorlabs/web-sdk/commit/235bc05c18acbf41c65bca9dd051f1312839aa4d))


### Bug Fixes

* add onCreated test and fix keepAlive retry rejection asymmetry ([5cd1c30](https://github.com/miradorlabs/web-sdk/commit/5cd1c30038d94999c2f3cfbc07fc2cfdf9078936))
* correct onFlushed item count and decouple lifetime timer from keepAlive ([f29055d](https://github.com/miradorlabs/web-sdk/commit/f29055df0467d25606dad4109d4a911daae8a785))
* remove date option from addEvent options ([0efaf00](https://github.com/miradorlabs/web-sdk/commit/0efaf00d56cd1e5c764c2e0f365456af5d946993))
* remove date option from addEvent options ([dea2258](https://github.com/miradorlabs/web-sdk/commit/dea2258b8a3c72a7db62f88b76ae6b4464437b64))

## [1.6.0](https://github.com/miradorlabs/web-sdk/compare/v1.5.0...v1.6.0) (2026-03-10)


### Features

* add addSafeTxHint for Safe multisig transaction tracking ([4d41aa7](https://github.com/miradorlabs/web-sdk/commit/4d41aa72af520c4c8f6b05b93df75c735ac977cf))
* add addSafeTxHint method for Safe multisig transaction tracking ([57c5294](https://github.com/miradorlabs/web-sdk/commit/57c52948a2f78ceb30a7c6befab8420aaa4b6d01))

## [1.5.0](https://github.com/miradorlabs/web-sdk/compare/v1.4.0...v1.5.0) (2026-03-06)


### Features

* add autoKeepAlive option to prevent zombie timers on resumed traces ([0d8c7a2](https://github.com/miradorlabs/web-sdk/commit/0d8c7a23c153cf83c626b94ceeefc2473252d85a))
* add keepAlive option to prevent zombie timers on resumed traces ([caf1d77](https://github.com/miradorlabs/web-sdk/commit/caf1d7730309027fae2d38f9ff15edf84d270c0b))

## [1.4.0](https://github.com/miradorlabs/web-sdk/compare/v1.3.0...v1.4.0) (2026-03-04)


### Features

* add safe msg hint functionality ([29518b7](https://github.com/miradorlabs/web-sdk/commit/29518b7a288496febb027a1a625a6c1026c7637f))
* add safe msg hint functionality ([47fe933](https://github.com/miradorlabs/web-sdk/commit/47fe933c1d752183a0941372373bf2e7d8a79b92))

## [1.3.0](https://github.com/miradorlabs/web-sdk/compare/v1.2.0...v1.3.0) (2026-02-27)


### Features

* add cross-SDK trace ID sharing ([2b9ea14](https://github.com/miradorlabs/web-sdk/commit/2b9ea14d43e653af1d7cdc366d599b9a0bcbcf32))
* add cross-SDK trace ID sharing ([17a0a79](https://github.com/miradorlabs/web-sdk/commit/17a0a7966225b10dba86705242abfe37c5e8512b))

## [1.2.0](https://github.com/miradorlabs/web-sdk/compare/v1.1.0...v1.2.0) (2026-02-25)


### Features

* add tx data capture, sendTransaction, and EIP-1193 provider ([9f86529](https://github.com/miradorlabs/web-sdk/commit/9f865293e0483eb288bd19e0bdd9c680709bc6a8))
* guard addTxInputData for empty data, use ethers.js in example app ([ac08315](https://github.com/miradorlabs/web-sdk/commit/ac083158e5f41434e7bca30f505f56b299d3fb31))
* tx metadata capture, sendTransaction, and EIP-1193 provider ([21a6614](https://github.com/miradorlabs/web-sdk/commit/21a66149a0f62537893afba8d17ce629d054b3b2))


### Bug Fixes

* emit tx input data as event consistently ([d014f49](https://github.com/miradorlabs/web-sdk/commit/d014f49bc7ba9dda9fc3cae2d5978f874e644158))

## [1.1.0](https://github.com/miradorlabs/web-sdk/compare/v1.0.0...v1.1.0) (2026-02-24)


### Features

* **inputdata:** add input data functionality and tests ([663562e](https://github.com/miradorlabs/web-sdk/commit/663562ec1cb2bc3c1866d5b07d26e32cd08cce88))
* **inputdata:** add input data functionality and tests ([83a6b82](https://github.com/miradorlabs/web-sdk/commit/83a6b821338f6c3ff5e6eb28ef31a5eaca459c88))


### Bug Fixes

* fix example app setup and gateway URL references ([fa5ca80](https://github.com/miradorlabs/web-sdk/commit/fa5ca80b3926d6c3a165ecaec75de8d7f496f652))
