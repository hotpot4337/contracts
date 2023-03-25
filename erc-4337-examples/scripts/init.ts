import fs from "fs/promises";
import path from "path";
import prettier from "prettier";
import { ethers } from "ethers";

import simpleAccountFactoryABI from "../../deployments/localgeth/SimpleAccountFactory.json";
import complexAccountFactoryABI from "../../deployments/localgeth/ComplexAccountFactory.json";

import merklize from "./complexAccount/merklizeOtps";
import genotp from "./complexAccount/genotp";
const { key, otps } = genotp();
console.log("next otp:", otps[0]);
console.log("process then delete TOTP:", key);

const tree = merklize(otps.map(digitStr => parseInt(digitStr)));
// console.log(tree);
// TODO all leaves of tree must be saved to gen proofs later

const INIT_CONFIG = {
  bundlerUrl: "http://localhost:4337",
  rpcUrl: "http://localhost:8545",
  signingKey: new ethers.Wallet(ethers.utils.randomBytes(32)).privateKey,
  totpSecret: key,
  merkleRoot: tree.root,
  entryPoint: "0x0576a174D229E3cFA37253523E645A78A0C91B57", // scroll: 0x9C5eCf83daf50e160E0Ed39cE2202465043409C2
  simpleAccountFactory: simpleAccountFactoryABI.address, // "0x71D63edCdA95C61D6235552b5Bc74E32d8e2527B",
  complexAccountFactory: complexAccountFactoryABI.address, // scroll: 0xAD4Cc0a7Ff3D9D35d1dca4Fb0413eB6fa67Bf434
  paymasterUrl: "",
};
const CONFIG_PATH = path.resolve(__dirname, "../config.json");

async function main() {
  return fs.writeFile(
    CONFIG_PATH,
    prettier.format(JSON.stringify(INIT_CONFIG, null, 2), { parser: "json" })
  );
}

main()
  .then(() => console.log(`Config written to ${CONFIG_PATH}`))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
