import { ethers } from "ethers";
import {
  ERC20_ABI,
  getSimpleAccount,
} from "../../src";
// @ts-ignore
import config from "../../config.json";

export default async function main(
  tkn: string,
) {
  const provider = new ethers.providers.JsonRpcProvider(config.rpcUrl);
  const accountAPI = getSimpleAccount(
    provider,
    config.signingKey,
    config.entryPoint,
    config.simpleAccountFactory,
    undefined // paymasterAPI
  );

  const token = ethers.utils.getAddress(tkn);
  const erc20 = new ethers.Contract(token, ERC20_ABI, provider);
  const me = await accountAPI.getAccountAddress();
  const [symbol, decimals, bal] = await Promise.all([
    erc20.symbol(),
    erc20.decimals(),
    erc20.balanceOf(me)
  ]);
  const amount = ethers.utils.formatUnits(bal, decimals);
  console.log(`BalanceOf(${me}) ${amount} ${symbol}...`);

}
