Do this:

```
yarn

yarn hardhat deploy --network localgeth

expect:
Generating typings for: 95 artifacts in dir: typechain for target: ethers-v5
Successfully generated 220 typings!
Compiled 91 Solidity files successfully
==entrypoint addr= 0x0576a174D229E3cFA37253523E645A78A0C91B57
==SimpleAccountFactory addr= 0x09c58cf6be8E25560d479bd52B4417d15bCA2845

yarn ts-node erc-4337-examples/scripts/init.ts

# edit contract addresses
vi erc-4337-examples/config.json

yarn ts-node erc-4337-examples/scripts/simpleAccount/index.ts address

# fund that address (bundler should already have funds)
(in geth) eth.sendTransaction({from: eth.coinbase, to: "<ADDRESS>", value: web3.toWei(1, "ether")})

# time to mix things up

# generate ts artifacts for any custom contracts
sh scripts/prepack-contracts-package.sh

yarn ts-node erc-4337-examples/scripts/complexAccount/index.ts address

```