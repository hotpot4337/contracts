import { ethers } from "ethers";
import {
  ERC20_ABI,
  getVerifyingPaymaster,
  getSimpleAccount,
  getGasFee,
  printOp,
  getHttpRpcClient,
} from "../../src";
// @ts-ignore
import config from "../../config.json";

// import { ConstantFlowAgreementV1 } from "@superfluid-finance/sdk-core";
// import * as sup from "@superfluid-finance/sdk-core";

export default async function main(
  tkn: string,
  t: string,
  amt: string,
  withPM: boolean
) {
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  const paymasterAPI = withPM
    ? getVerifyingPaymaster(config.paymasterUrl, config.entryPoint)
    : undefined;
  const accountAPI = getSimpleAccount(
    provider,
    config.signingKey,
    config.entryPoint,
    config.simpleAccountFactory,
    paymasterAPI
  );

  const token = ethers.utils.getAddress(tkn);
  const to = ethers.utils.getAddress(t);
  // TODO wrapped
  const erc20 = new ethers.Contract(token, ERC20_ABI, provider);
  const [symbol, decimals] = await Promise.all([
    erc20.symbol(),
    erc20.decimals(),
  ]);
  const amount = ethers.utils.parseUnits(amt, decimals);
  console.log(`Transferring ${amt} ${symbol}...`);


  const cfaV1Address = '0xcfa132e353cb4e398080b9700609bb008eceb125'; // mumbai
  // XXX const cfaV1 = new ethers.Contract(cfaV1Address, sup.ConstantFlowAgreementV1__factory.abi, provider);
  const CFA_ABI = [
    // 'function createFlow(ISuperToken token, address sender, address receiver, int96 flowrate, bytes memory userData) external returns (bool)',
    // etherscan: createFlow(address token,address sender,address receiver,int96 flowrate,bytes userData)
    'function createFlow(address token, address sender, address receiver, int96 flowrate, bytes memory userData) external returns (bool)',
    // 'function getFlow(address token, address sender, address receiver) external view override returns (uint256 timestamp, int96 flowRate, uint256 deposit, uint256 owedDeposit)'
    // etherscan only getFlowInfo not getFlow - returns lastUpdated now timestamp
    'function getFlowInfo(address token, address sender, address receiver) external view override returns (uint256 lastUpdated, int96 flowRate, uint256 deposit, uint256 owedDeposit)'
  ];
  const cfaV1 = new ethers.Contract(cfaV1Address, CFA_ABI, provider);

  const [lastUpdated, flowrate, deposit, owedDeposit] = await cfaV1.getFlowInfo(
    tkn,
    '0x9230891a2f0d2c78Fb14F33d28AB6C1E3754AE1D',
    to)

  console.log('lastUpdated:', (new Date(lastUpdated.toNumber() * 1000)).toLocaleString());
  console.log('flowrate', ethers.utils.formatUnits(flowrate, decimals))
  console.log('deposit', ethers.utils.formatUnits(deposit, decimals))
  console.log('owedDeposit', ethers.utils.formatUnits(owedDeposit, decimals))


  return;










  const op = await accountAPI.createSignedUserOp({
    target: erc20.address,
    data: erc20.interface.encodeFunctionData("transfer", [to, amount]),
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
