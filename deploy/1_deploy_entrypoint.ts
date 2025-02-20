import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { Create2Factory } from '../src/Create2Factory'
import { Create2FactoryMantle } from '../src/Create2FactoryMantle'
import { Create2FactoryScroll } from '../src/Create2FactoryScroll'
import { ethers } from 'hardhat'

const deployEntryPoint: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const provider = ethers.provider
  const from = await provider.getSigner().getAddress()
  if (hre.network.name === 'scroll_alpha') {
    await new Create2FactoryScroll(ethers.provider).deployFactory()
  } else if (hre.network.name === 'mantle_testnet') {
    await new Create2FactoryMantle(ethers.provider).deployFactory()
  } else {
    await new Create2Factory(ethers.provider).deployFactory()
  }
  const ret = await hre.deployments.deploy(
    'EntryPoint', {
      from,
      args: [],
      gasLimit: 6e6,
      deterministicDeployment: true
    })
  console.log('==entrypoint addr=', ret.address)
/*
  const entryPointAddress = ret.address
  const w = await hre.deployments.deploy(
    'SimpleAccount', {
      from,
      args: [entryPointAddress, from],
      gasLimit: 2e6,
      deterministicDeployment: true
    })

  console.log('== wallet=', w.address)

  const t = await hre.deployments.deploy('TestCounter', {
    from,
    deterministicDeployment: true
  })
  console.log('==testCounter=', t.address)
  */
}

export default deployEntryPoint
