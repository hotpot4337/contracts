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

// handmade
// const ROUTER_ABI = [
//   "function removeLiquidityETHSupportingFeeOnTransferTokens( address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline) external returns (uint amountETH)",
//   "function removeLiquidityETHWithPermitSupportingFeeOnTransferTokens( address token, uint liquidity, uint amountTokenMin, uint amountETHMin, address to, uint deadline, bool approveMax, uint8 v, bytes32 r, bytes32 s) external returns (uint amountETH)",
//   "function swapExactTokensForTokensSupportingFeeOnTransferTokens( uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external",
//   "function swapExactETHForTokensSupportingFeeOnTransferTokens( uint amountOutMin, address[] calldata path, address to, uint deadline) external payable",
//   "function swapExactTokensForETHSupportingFeeOnTransferTokens( uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external"  
// ]
const ROUTER_ABI = [
  "function swapExactTokensForTokens( uint amountIn, uint amountOutMin, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)",
  "function swapTokensForExactTokens( uint amountOut, uint amountInMax, address[] calldata path, address to, uint deadline) external returns (uint[] memory amounts)"
]  
export default async function main(
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

  const routerAddr = '0x2689377666F7Ae695A270aE6AE4ed2170bf33516';
  const myCounterfactualaddress = '0x2B84261fc559c79A200CAf24CdeB3b77d22b132a';
  const router = new ethers.Contract(routerAddr, ROUTER_ABI, provider);
  // XXX wrong
  // WETH:  0x13D12e00c5C540c637d8B63f01478cf00CFAfeA8
// USDC:  0xdD3419066F1E4E5ff8780b1e5F2c4C76DD623760
  const wethAddr = '0x48c31500f6b720eBb17ac2798Df12Cd433EB847D';
  const usdcAddr = '0x4407E909D4Adeb2088bef17F140cbd0eE6e50e1F';
  const tokenIn = wethAddr; // = ethers.utils.getAddress(tkn);
  const tokenOut = usdcAddr; // = ethers.utils.getAddress(tkn);
  // const to = ethers.utils.getAddress(t);
  const erc20in = new ethers.Contract(tokenIn, ERC20_ABI, provider);
  const [symbolIn, decimalsIn] = await Promise.all([
    erc20in.symbol(),
    erc20in.decimals(),
  ]);
  const erc20out = new ethers.Contract(tokenOut, ERC20_ABI, provider);
  const [symbolOut, decimalsOut] = await Promise.all([
    erc20out.symbol(),
    erc20out.decimals(),
  ]);
  const amountIn = ethers.utils.parseUnits(amt, decimalsIn);
  console.log(`Swapping in ${amt} ${symbolIn}...`);

  const amountOutMin = 0; // XXX
  const deadline = ethers.constants.MaxUint256;

  // APPROVE

  const approveOp = await accountAPI.createSignedUserOp({
    target: tokenIn,
    data: erc20in.interface.encodeFunctionData("approve", [routerAddr, amountIn]),
    ...(await getGasFee(provider)),
  });
  console.log(`Signed (approve) UserOperation: ${await printOp(approveOp)}`);

  const client = await getHttpRpcClient(
    provider,
    config.bundlerUrl,
    config.entryPoint
  );
  const approveUoHash = await client.sendUserOpToBundler(approveOp);
  console.log(`UserOpHash: ${approveUoHash}`);

  console.log("Waiting for transaction...");
  let txHash = await accountAPI.getUserOpReceipt(approveUoHash);
  console.log(`Transaction hash: ${txHash}`);  


  // SWAP

  const op = await accountAPI.createSignedUserOp({
    target: router.address,
    data: router.interface.encodeFunctionData("swapExactTokensForTokens", [
      amountIn, amountOutMin, [tokenIn, tokenOut], myCounterfactualaddress, deadline
    ]),
    ...(await getGasFee(provider)),
  });
  console.log(`Signed UserOperation: ${await printOp(op)}`);

  // const client = await getHttpRpcClient(
  //   provider,
  //   config.bundlerUrl,
  //   config.entryPoint
  // );
  const uoHash = await client.sendUserOpToBundler(op);
  console.log(`UserOpHash: ${uoHash}`);

  console.log("Waiting for transaction...");
  txHash = await accountAPI.getUserOpReceipt(uoHash);
  console.log(`Transaction hash: ${txHash}`);
}
