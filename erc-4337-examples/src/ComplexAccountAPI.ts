import { BigNumber, BigNumberish, utils } from 'ethers'
// import {
//   SimpleAccount,
//   SimpleAccount__factory, SimpleAccountFactory,
//   SimpleAccountFactory__factory
// } from '@account-abstraction/contracts'
import {
  ComplexAccount,
  ComplexAccount__factory, ComplexAccountFactory,
  ComplexAccountFactory__factory
} from '../../contracts/dist'; // gen with scripts/prepack-contracts-package.sh

import { arrayify, hexConcat } from 'ethers/lib/utils'
import { Signer } from '@ethersproject/abstract-signer'
import { BaseApiParams, BaseAccountAPI } from '../../packages/sdk/src/BaseAccountAPI'; // './BaseAccountAPI'
// import { BaseApiParams, BaseAccountAPI } from '../../packages/sdk/src/BaseAccountAPI';
/**
 * constructor params, added no top of base params:
 * @param owner the signer object for the account owner
 * @param factoryAddress address of contract "factory" to deploy new contracts (not needed if account already deployed)
 * @param index nonce value used when creating multiple accounts for the same owner
 */
export interface ComplexAccountApiParams extends BaseApiParams {
  owner: Signer
  merkleRoot: string
  factoryAddress?: string
  index?: number

}
// export interface BaseApiParams {
//   provider: Provider
//   entryPointAddress: string
//   accountAddress?: string
//   overheads?: Partial<GasOverheads>
//   paymasterAPI?: PaymasterAPI
// }

/**
 * An implementation of the BaseAccountAPI using the ComplexAccount contract.
 * - contract deployer gets "entrypoint", "owner" addresses and "index" nonce
 * - owner signs requests using normal "Ethereum Signed Message" (ether's signer.signMessage())
 * - nonce method is "nonce()"
 * - execute method is "execFromEntryPoint()"
 */
export class ComplexAccountAPI extends BaseAccountAPI {
  factoryAddress?: string
  owner: Signer
  index: number
  merkleRoot: string

  /**
   * our account contract.
   * should support the "execFromEntryPoint" and "nonce" methods
   */
  accountContract?: ComplexAccount

  factory?: ComplexAccountFactory

  constructor (params: ComplexAccountApiParams) {
    super(params)
    this.factoryAddress = params.factoryAddress
    this.owner = params.owner
    this.index = params.index ?? 0
    this.merkleRoot = params.merkleRoot // TOMO
  }

  async _getAccountContract (): Promise<ComplexAccount> {
    if (this.accountContract == null) {
      this.accountContract = ComplexAccount__factory.connect(await this.getAccountAddress(), this.provider)
    }
    return this.accountContract
  }

  /**
   * return the value to put into the "initCode" field, if the account is not yet deployed.
   * this value holds the "factory" address, followed by this account's information
   */
  async getAccountInitCode (): Promise<string> {
    if (this.factory == null) {
      if (this.factoryAddress != null && this.factoryAddress !== '') {
        this.factory = ComplexAccountFactory__factory.connect(this.factoryAddress, this.provider)
      } else {
        throw new Error('no factory to get initCode')
      }
    }
    return hexConcat([
      this.factory.address,
      this.factory.interface.encodeFunctionData('createAccount', [await this.owner.getAddress(), this.index, utils.formatBytes32String("TOMO")])
    ])
  }

  async getNonce (): Promise<BigNumber> {
    if (await this.checkAccountPhantom()) {
      return BigNumber.from(0)
    }
    const accountContract = await this._getAccountContract()
    return await accountContract.nonce()
  }

  /**
   * encode a method call from entryPoint to our contract
   * @param target
   * @param value
   * @param data
   */
  async encodeExecute (target: string, value: BigNumberish, data: string): Promise<string> {
    const accountContract = await this._getAccountContract()
    return accountContract.interface.encodeFunctionData(
      'execute',
      [
        target,
        value,
        data
      ])
  }

  async signUserOpHash (userOpHash: string): Promise<string> {
    return await this.owner.signMessage(arrayify(userOpHash))
  }
}
