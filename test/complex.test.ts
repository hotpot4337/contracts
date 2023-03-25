import { ethers } from 'hardhat'
import { Wallet } from 'ethers'
import generateMerkleTree from './utils/gen-merk'
import { ComplexAccount } from '../typechain'
import { createAccountOwner, getBalance, createAccount } from './testutils'
import { parseEther, solidityKeccak256 } from 'ethers/lib/utils'
import { fillUserOpDefaults, getUserOpHash, signUserOp } from './UserOp'
import { UserOperation } from './UserOperation'
import { expect } from 'chai'

describe('ComplexACcount', () => {
  let account: ComplexAccount
  let accounts
  let accountOwner: Wallet
  let userOp: UserOperation
  let userOpHash: string
  let preBalance: number
  let expectedPay: number

  const actualGasPrice = 1e9

  const ethersSigner = ethers.provider.getSigner()
  const tree = generateMerkleTree()
  console.log(tree.root)

  before(async () => {
    accounts = await ethers.provider.listAccounts()
    accountOwner = createAccountOwner()

    const entryPoint = accounts[2]
    console.log('creating account');
    ({ proxy: account } = await createAccount(
      await ethers.getSigner(entryPoint),
      accountOwner.address,
      tree.root,
      entryPoint
    ))
    console.log('Funding ETH')
    await ethersSigner.sendTransaction({
      from: accounts[0],
      to: account.address,
      value: parseEther('0.2')
    })
    const callGasLimit = 200000
    const verificationGasLimit = 100000
    const maxFeePerGas = 3e9
    const chainId = await ethers.provider
      .getNetwork()
      .then((net) => net.chainId)

    const salt = 0xDEADBEEF
    const totpCode = 829868
    const saltHash = solidityKeccak256(['uint256', 'uint256'], [0, salt])
    const totpHash = solidityKeccak256(['uint256', 'uint256'], [0, totpCode])

    const proof = tree.getProof([saltHash, totpHash])

    userOp = signUserOp(
      fillUserOpDefaults({
        sender: account.address,
        callGasLimit,
        verificationGasLimit,
        maxFeePerGas
      }),
      accountOwner,
      entryPoint,
      chainId,
      proof,
      saltHash,
      0,
      totpCode
    )
    userOpHash = await getUserOpHash(userOp, entryPoint, chainId)

    expectedPay = actualGasPrice * (callGasLimit + verificationGasLimit)

    preBalance = await getBalance(account.address)
    const ret = await account.validateUserOp(userOp, userOpHash, expectedPay, {
      gasPrice: actualGasPrice
    })
    await ret.wait()
  })

  it('should verify correct totp code', async () => {
    // May not be the right one with the saltHashdepending on sorting
    const salt = 0xdeadbeef
    const totpCode = 829868
    const saltHash = solidityKeccak256(['uint256', 'uint256'], [0, salt])
    const totpHash = solidityKeccak256(['uint256', 'uint256'], [0, totpCode])

    const proof = tree.getProof([saltHash, totpHash])
    console.log(await account.merkleRoot())
    await account._validateTotp(proof, saltHash, 0, 829868)
  })

  it('should increment nonce', async () => {
    expect(await account.nonce()).to.equal(1)
  })

  it('should pay', async () => {
    const postBalance = await getBalance(account.address)
    expect(preBalance - postBalance).to.eql(expectedPay)
  })
})
