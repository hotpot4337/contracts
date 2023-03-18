import { ethers } from "ethers";
import {
  getVerifyingPaymaster,
  getComplexAccount,
  getGasFee,
  printOp,
  getHttpRpcClient,
} from "../../src";
// @ts-ignore
import config from "../../config.json";

// @ts-ignore
import accountFactoryABI from "../../../deployments/localgeth/ComplexAccountFactory.json";

export default async function main(t: string, amt: string, withPM: boolean) {
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  const paymasterAPI = withPM
    ? getVerifyingPaymaster(config.paymasterUrl, config.entryPoint)
    : undefined;
  const accountAPI = getComplexAccount(
    provider,
    config.signingKey,
    config.entryPoint,
    // config.simpleAccountFactory,
    accountFactoryABI.address,
    paymasterAPI
  );

  // console.log(config);
  // console.log(await getGasFee(provider))
  const target = ethers.utils.getAddress(t);
  const value = ethers.utils.parseEther(amt);
  const op = await accountAPI.createSignedUserOp({
    target,
    value,
    data: "0x",
    ...(await getGasFee(provider)),
  });
  console.log(`Signed UserOperation: ${await printOp(op)}`);

  const client = await getHttpRpcClient(
    provider,
    config.bundlerUrl,
    config.entryPoint
  );
  // return;
  const uoHash = await client.sendUserOpToBundler(op);
  console.log(`UserOpHash: ${uoHash}`);

  console.log("Waiting for transaction...");
  const txHash = await accountAPI.getUserOpReceipt(uoHash);
  console.log(`Transaction hash: ${txHash}`);
}
