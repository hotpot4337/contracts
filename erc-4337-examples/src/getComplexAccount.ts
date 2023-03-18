import { SimpleAccountAPI, PaymasterAPI } from "@account-abstraction/sdk";
import { ethers } from "ethers";
import { JsonRpcProvider } from "@ethersproject/providers";

/* from Base, which isn't public/exported */
// import { Provider } from '@ethersproject/providers'

// import { TransactionDetailsForUserOp } from './TransactionDetailsForUserOp'
// import { resolveProperties } from 'ethers/lib/utils'

// import { calcPreVerificationGas, GasOverheads } from "@account-abstraction/sdk"; // './calcPreVerificationGas'

import { BaseApiParams } from '../../packages/sdk/src/BaseAccountAPI';

// export interface BaseApiParams {
//   provider: Provider
//   entryPointAddress: string
//   accountAddress?: string
//   overheads?: Partial<GasOverheads>
//   paymasterAPI?: PaymasterAPI
// }

/* from sdk/SimpleAccountAPI.ts */
// import { BigNumber, BigNumberish } from 'ethers'
// import {
//   SimpleAccount,
//   SimpleAccount__factory, SimpleAccountFactory,
//   SimpleAccountFactory__factory
// } from '@account-abstraction/contracts'

import {
  SimpleAccount,
  SimpleAccount__factory, SimpleAccountFactory,
  SimpleAccountFactory__factory
} from '../../contracts/dist'; // gen with scripts/prepack-contracts-package.sh
import {
  ComplexAccount,
  ComplexAccount__factory, ComplexAccountFactory,
  ComplexAccountFactory__factory
} from '../../contracts/dist'; // gen with scripts/prepack-contracts-package.sh

import { arrayify, hexConcat } from 'ethers/lib/utils'
import { Signer } from '@ethersproject/abstract-signer'
// import { BaseApiParams, BaseAccountAPI } from './BaseAccountAPI'

/**
 * constructor params, added no top of base params:
 * @param owner the signer object for the account owner
 * @param factoryAddress address of contract "factory" to deploy new contracts (not needed if account already deployed)
 * @param index nonce value used when creating multiple accounts for the same owner
 */
// export interface ComplexAccountApiParams extends BaseApiParams {
export interface ComplexAccountApiParams extends BaseApiParams {
  owner: Signer
  factoryAddress?: string
  index?: number

}

export class ComplexAccountAPI extends SimpleAccountAPI {};


/* existing stuff */

export function getComplexAccount(
  provider: JsonRpcProvider,
  signingKey: string,
  entryPointAddress: string,
  factoryAddress: string,
  paymasterAPI?: PaymasterAPI
) {
  const owner = new ethers.Wallet(signingKey, provider);
  const sw = new ComplexAccountAPI({
    provider,
    entryPointAddress,
    owner,
    factoryAddress,
    paymasterAPI,
  });

  // Hack: default getUserOpReceipt does not include fromBlock which causes an error for some RPC providers.
  sw.getUserOpReceipt = async (
    userOpHash: string,
    timeout = 30000,
    interval = 5000
  ): Promise<string | null> => {
    const endtime = Date.now() + timeout;
    const block = await sw.provider.getBlock("latest");
    while (Date.now() < endtime) {
      // @ts-ignore
      const events = await sw.entryPointView.queryFilter(
        // @ts-ignore
        sw.entryPointView.filters.UserOperationEvent(userOpHash),
        Math.max(0, block.number - 100)
      );
      if (events.length > 0) {
        return events[0].transactionHash;
      }
      await new Promise((resolve) => setTimeout(resolve, interval));
    }
    return null;
  };

  return sw;
}
