// from: https://github.com/Arachnid/deterministic-deployment-proxy
import { BigNumber, BigNumberish, ethers, Signer } from 'ethers'
import { arrayify, hexConcat, hexlify, hexZeroPad, keccak256 } from 'ethers/lib/utils'
import { Provider } from '@ethersproject/providers'
import { TransactionRequest } from '@ethersproject/abstract-provider'

export class Create2FactoryScroll {
  factoryDeployed = false

  // from: https://github.com/Arachnid/deterministic-deployment-proxy
  // scroll: https://github.com/safe-global/safe-singleton-factory/issues/88
  // static readonly contractAddress = '0x4e59b44847b379578588920ca78fbf26c0b4956c'
  // static readonly contractAddress = '0xBEDFa841e8A5B0391e90061FccE7c99775d0e1a0'
  // static readonly factoryTx = '0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222'
  //                 transaction="0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222",
  // static readonly factoryDeployer = '0x3fab184622dc19b6109349b94811493bf2a45362'
  // https://gist.github.com/pajicf/e954855be50caf9ac9c61f910e96cd03:
  // static readonly factoryTx = '0xf8a88085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf383104ec5a0c4323f8202427606fa436150b2571ecef7e557617cf471fa84fac8ba679f9f7aa061057928f0be3caed58e7619bf7a59de1c7425e8b45a6c099101049f74e0ca0c'
  // signerAddress:
  // static readonly factoryDeployer = '0xd2aEd89b0687a7F80B8415A53D95999A40a340Ba'
  // https://github.com/safe-global/safe-singleton-factory/blob/main/artifacts/534353/deployment.json
  static readonly contractAddress = '0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7'
  static readonly factoryTx = '0xf8a680830f4240830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf383104ec6a0ace7bece23b6d9db3563ef46bef4934922a9ded4ada6454f9cf6a179278bfcb9a03e3d8932a8405fbef4b0d734ebddd69935bf0d29aec15e07dabdbe2a31091e75'
  static readonly factoryDeployer = '0xE1CB04A0fA36DdD16a06ea828007E35e1a3cBC37'
  static readonly deploymentGasPrice = 100e9
  static readonly deploymentGasLimit = 100000
  static readonly factoryDeploymentFee = (Create2FactoryScroll.deploymentGasPrice * Create2FactoryScroll.deploymentGasLimit).toString()

  constructor (readonly provider: Provider,
    readonly signer = (provider as ethers.providers.JsonRpcProvider).getSigner()) {
  }

  /**
   * deploy a contract using our deterministic deployer.
   * The deployer is deployed (unless it is already deployed)
   * NOTE: this transaction will fail if already deployed. use getDeployedAddress to check it first.
   * @param initCode delpoyment code. can be a hex string or factory.getDeploymentTransaction(..)
   * @param salt specific salt for deployment
   * @param gasLimit gas limit or 'estimate' to use estimateGas. by default, calculate gas based on data size.
   */
  async deploy (initCode: string | TransactionRequest, salt: BigNumberish = 0, gasLimit?: BigNumberish | 'estimate'): Promise<string> {
    await this.deployFactory()
    if (typeof initCode !== 'string') {
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      initCode = (initCode as TransactionRequest).data!.toString()
    }

    const addr = Create2FactoryScroll.getDeployedAddress(initCode, salt)
    if (await this.provider.getCode(addr).then(code => code.length) > 2) {
      return addr
    }

    const deployTx = {
      to: Create2FactoryScroll.contractAddress,
      data: this.getDeployTransactionCallData(initCode, salt)
    }
    if (gasLimit === 'estimate') {
      gasLimit = await this.signer.estimateGas(deployTx)
    }

    // manual estimation (its bit larger: we don't know actual deployed code size)
    if (gasLimit === undefined) {
      gasLimit = arrayify(initCode)
        .map(x => x === 0 ? 4 : 16)
        .reduce((sum, x) => sum + x) +
        200 * initCode.length / 2 + // actual is usually somewhat smaller (only deposited code, not entire constructor)
        6 * Math.ceil(initCode.length / 64) + // hash price. very minor compared to deposit costs
        32000 +
        21000

      // deployer requires some extra gas
      gasLimit = Math.floor(gasLimit * 64 / 63)
    }

    const ret = await this.signer.sendTransaction({ ...deployTx, gasLimit })
    await ret.wait()
    if (await this.provider.getCode(addr).then(code => code.length) === 2) {
      throw new Error('failed to deploy')
    }
    return addr
  }

  getDeployTransactionCallData (initCode: string, salt: BigNumberish = 0): string {
    const saltBytes32 = hexZeroPad(hexlify(salt), 32)
    return hexConcat([
      saltBytes32,
      initCode
    ])
  }

  /**
   * return the deployed address of this code.
   * (the deployed address to be used by deploy()
   * @param initCode
   * @param salt
   */
  static getDeployedAddress (initCode: string, salt: BigNumberish): string {
    const saltBytes32 = hexZeroPad(hexlify(salt), 32)
    return '0x' + keccak256(hexConcat([
      '0xff',
      Create2FactoryScroll.contractAddress,
      saltBytes32,
      keccak256(initCode)
    ])).slice(-40)
  }

  // deploy the factory, if not already deployed.
  async deployFactory (signer?: Signer): Promise<void> {
    if (await this._isFactoryDeployed()) {
      return
    }
    await (signer ?? this.signer).sendTransaction({
      to: Create2FactoryScroll.factoryDeployer,
      value: BigNumber.from(Create2FactoryScroll.factoryDeploymentFee)
    })
    await this.provider.sendTransaction(Create2FactoryScroll.factoryTx)
    if (!await this._isFactoryDeployed()) {
      throw new Error('fatal: failed to deploy deterministic deployer')
    }
  }

  async _isFactoryDeployed (): Promise<boolean> {
    if (!this.factoryDeployed) {
      const deployed = await this.provider.getCode(Create2FactoryScroll.contractAddress)
      if (deployed.length > 2) {
        this.factoryDeployed = true
      }
    }
    return this.factoryDeployed
  }
}
