import { getComplexAccount } from "../../src";
import { ethers } from "ethers";
// @ts-ignore
import config from "../../config.json";

// @ts-ignore
import accountFactoryABI from "../../../deployments/localgeth/ComplexAccountFactory.json";

export default async function main() {
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  const accountAPI = getComplexAccount(
    provider,
    config.signingKey,
    config.entryPoint,
    // config.simpleAccountFactory
    accountFactoryABI.address
  );
  const address = await accountAPI.getCounterFactualAddress();

  console.log(`ComplexAccount address: ${address}`);
}
