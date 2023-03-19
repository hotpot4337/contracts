import { ethers } from "ethers";
import {
  // ERC20_ABI,
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

// XXX copy IWETH
const WETH_ABI = [
  "function deposit() external payable",
  "function approve(address spender, uint amount) external"
];

export default async function main(
  tkn: string,
  // t: string,
  amt: string,
  withPM: boolean
) {
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  const paymasterAPI = withPM
    ? getVerifyingPaymaster(config.paymasterUrl, config.entryPoint)
    : undefined;
  const merkleRoot = ethers.utils.formatBytes32String("TOMO TEST");
  const accountAPI = getComplexAccount(
    provider,
    config.signingKey,
    merkleRoot,
    config.entryPoint,
    // config.ComplexAccountFactory,
    accountFactoryABI.address,
    paymasterAPI
  );

  const token = ethers.utils.getAddress(tkn);
  // const to = ethers.utils.getAddress(t);
  // const erc20 = new ethers.Contract(token, ERC20_ABI, provider);
  const weth = new ethers.Contract(token, WETH_ABI, provider);
  // const [symbol, decimals] = await Promise.all([
  //   erc20.symbol(),
  //   erc20.decimals(),
  // ]);
  const value = ethers.utils.parseEther(amt);
  console.log(`Depositing ${amt} ...`);

  const op = await accountAPI.createSignedUserOp({
    target: weth.address,
    value,
    data: weth.interface.encodeFunctionData("deposit"),
    ...(await getGasFee(provider)),
  });
  console.log(`Signed UserOperation: ${await printOp(op)}`);

  const client = await getHttpRpcClient(
    provider,
    config.bundlerUrl,
    config.entryPoint
  );
  const uoHash = await client.sendUserOpToBundler(op);
  console.log(`UserOpHash: ${uoHash}`);

  console.log("Waiting for transaction...");
  const txHash = await accountAPI.getUserOpReceipt(uoHash);
  console.log(`Transaction hash: ${txHash}`);
}
