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
import { UserOperationStruct } from "../../../contracts/dist";

// import { ConstantFlowAgreementV1 } from "@superfluid-finance/sdk-core";
// import * as sup from "@superfluid-finance/sdk-core";

async function _doOp(accountAPI, op: UserOperationStruct) {
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
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

  const me = await accountAPI.getAccountAddress();

  // NOTE: amount Number of tokens to be upgraded (in 18 decimals)
  const SUPERTOKEN_ABI = ['function upgrade(uint256 amount)'].concat(ERC20_ABI);
  const fDAIaddress = '0x15f0ca26781c3852f8166ed2ebce5d18265cceb7';
  const fDAIxAddress = '0x5d8b4c2554aeb7e86f387b4d6c00ac33499ed01f'; // Super
  const fDAI = new ethers.Contract(fDAIaddress, ERC20_ABI, provider);
  const fDAIx = new ethers.Contract(fDAIxAddress, SUPERTOKEN_ABI, provider);
  const [fDAIsymbol, fDAIdecimals] = await Promise.all([
    fDAI.symbol(),
    fDAI.decimals(),
  ]);
  const [fDAIxSymbol, fDAIxDecimals] = await Promise.all([
    fDAIx.symbol(),
    fDAIx.decimals(),
  ]);
  const tomo = '0x9230891a2f0d2c78fb14f33d28ab6c1e3754ae1d';
  const tomosAllowance = await fDAI.allowance(tomo, fDAIxAddress);
  console.log(`${fDAIsymbol} allowance(tomo=${tomo}, wrapper contract) =`, ethers.utils.formatUnits(tomosAllowance, fDAIdecimals));



  const prevAllowance = await fDAI.allowance(me, fDAIxAddress);
  console.log(`prev ${fDAIsymbol} allowance(${me}, wrapper contract) =`, ethers.utils.formatUnits(prevAllowance, fDAIdecimals));


  // APPROVE WRAPPER SPENDING fDAI
  const wrapApproveAmount = ethers.utils.parseUnits("15", fDAIdecimals); // XXX make arg
  const wrapAmount = ethers.utils.parseUnits("0.11", fDAIdecimals); // XXX make arg
  const op1 = await accountAPI.createSignedUserOp({
    target: fDAIaddress,
    data: fDAI.interface.encodeFunctionData("approve", [fDAIxAddress, wrapApproveAmount]),
    ...(await getGasFee(provider)),
  });
  console.log(`Signed UserOperation: ${await printOp(op1)}`);
  _doOp(accountAPI, op1);


  console.log('wait 5s...');
  await new Promise(resolve => setTimeout(resolve, 5000));


  const newAllowance = await fDAI.allowance(me, fDAIxAddress);
  console.log(`new ${fDAIsymbol} allowance(${me}, wrapper contract) =`, ethers.utils.formatUnits(newAllowance, fDAIdecimals));
  console.log(`fDAIx balanceOf(${me}) =`, ethers.utils.formatUnits(await fDAIx.balanceOf(me), fDAIxDecimals));

  // UPGRADE (WRAP)
  const op2 = await accountAPI.createSignedUserOp({
    target: fDAIxAddress,
    data: fDAIx.interface.encodeFunctionData("upgrade", [wrapAmount]),
    ...(await getGasFee(provider)),
  });
  console.log(`Signed UserOperation: ${await printOp(op2)}`);
  _doOp(accountAPI, op2);
  

  console.log('wait 5s...');
  await new Promise(resolve => setTimeout(resolve, 5000));


  const bal = ethers.utils.formatUnits(await fDAIx.balanceOf(me), decimals);
  console.log(`new fDAIx balanceOf(${me}) = ${bal}`);
  
  return;


  // flowRate New flow rate in amount per second

  // const cfaV1Address = '0xcfa132e353cb4e398080b9700609bb008eceb125'; // mumbai
  // // XXX const cfaV1 = new ethers.Contract(cfaV1Address, sup.ConstantFlowAgreementV1__factory.abi, provider);
  // const CFA_ABI = [
  //   // 'function createFlow(ISuperToken token, address sender, address receiver, int96 flowrate, bytes memory userData) external returns (bool)',
  //   // etherscan: createFlow(address token,address sender,address receiver,int96 flowrate,bytes userData)
  //   'function createFlow(address token, address sender, address receiver, int96 flowrate, bytes memory userData) external returns (bool)',
  //   // 'function getFlow(address token, address sender, address receiver) external view override returns (uint256 timestamp, int96 flowRate, uint256 deposit, uint256 owedDeposit)'
  //   // etherscan only getFlowInfo not getFlow - returns lastUpdated now timestamp
  //   'function getFlowInfo(address token, address sender, address receiver) external view override returns (uint256 lastUpdated, int96 flowRate, uint256 deposit, uint256 owedDeposit)',
  //   // XXX not this one
  //   // 'function createFlow(address token, address receiver, int96 flowRate, bytes calldata ctx) external override returns(bytes memory newCtx)'
  // ];
  // const cfaV1 = new ethers.Contract(cfaV1Address, CFA_ABI, provider);

  // const [lastUpdated, flowrate, deposit, owedDeposit] = await cfaV1.getFlowInfo(
  //   tkn,
  //   '0x9230891a2f0d2c78Fb14F33d28AB6C1E3754AE1D',
  //   to)

  // console.log('lastUpdated:', (new Date(lastUpdated.toNumber() * 1000)).toLocaleString());
  // console.log('flowrate', ethers.utils.formatUnits(flowrate, decimals))
  // console.log('deposit', ethers.utils.formatUnits(deposit, decimals))
  // console.log('owedDeposit', ethers.utils.formatUnits(owedDeposit, decimals))

  // const emptyUserData = '0x';

  // const op = await accountAPI.createSignedUserOp({
  //   target: cfaV1Address,
  //   data: cfaV1.interface.encodeFunctionData("createFlow", [token, me, to, amount, emptyUserData]),
  //   ...(await getGasFee(provider)),
  // });
  // console.log(`Signed UserOperation: ${await printOp(op)}`);

  // const client = await getHttpRpcClient(
  //   provider,
  //   config.bundlerUrl,
  //   config.entryPoint
  // );
  // const uoHash = await client.sendUserOpToBundler(op);
  // console.log(`UserOpHash: ${uoHash}`);

  // console.log("Waiting for transaction...");
  // const txHash = await accountAPI.getUserOpReceipt(uoHash);
  // console.log(`Transaction hash: ${txHash}`);
}
