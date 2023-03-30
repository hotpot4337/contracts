import { getComplexAccount } from "../../src";
import { ethers } from "ethers";
// @ts-ignore
import config from "../../config.json";

// @ts-ignore
import accountFactoryABIscroll from "../../../deployments/scroll_alpha/ComplexAccountFactory.json";
import accountFactoryABI from "../../../deployments/localgeth/ComplexAccountFactory.json";
const factoryAddress = config.complexAccountFactory ? config.complexAccountFactory :
 (config.rpcUrl == 'https://alpha-rpc.scroll.io/l2' ? accountFactoryABIscroll.address : accountFactoryABI.address);

// export interface ComplexAccountApiParams extends BaseApiParams {
//   owner: Signer
//   merkleRoot: string
//   factoryAddress?: string
//   index?: number

// }
// export interface BaseApiParams {
//   provider: Provider
//   entryPointAddress: string
//   accountAddress?: string
//   overheads?: Partial<GasOverheads>
//   paymasterAPI?: PaymasterAPI
// }
export default async function main() {
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  const merkleRoot = ethers.utils.formatBytes32String("TOMO TEST");
  const accountAPI = getComplexAccount(
    provider,
    config.signingKey,
    merkleRoot,
    config.entryPoint,
    // config.simpleAccountFactory
    // accountFactoryABI.address
    factoryAddress
  );
  const address = await accountAPI.getCounterFactualAddress();

  console.log(`ComplexAccount address: ${address}`);
}
