import { HardhatRuntimeEnvironment } from 'hardhat/types'
import { DeployFunction } from 'hardhat-deploy/types'
import { Create2Factory } from '../src/Create2Factory'
import { Create2FactoryMantle } from '../src/Create2FactoryMantle'
import { ethers } from 'hardhat'

const deployEntryPoint: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const provider = ethers.provider
  // const provider = hre.network.provider
  const from = await provider.getSigner().getAddress()

  const mantleDeployed = true;
  if (!mantleDeployed && hre.network.name == 'mantle_testnet') {
    console.log(`Deploying to network: ${hre.network.name}`);
    // const contractFactory = await ethers.getContractFactory("MyContract");
    // const provider2 = new ethers.providers.JsonRpcProvider(hre.config.networks['mantle_testnet'].url)
    // const provider2 = new ethers.providers.JsonRpcProvider(); // use your own provider here

    // const contract = await contractFactory.deploy("0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222");
    // console.log(await provider2.send("eth_getCode", ["0x4e59b44847b379578588920ca78fbf26c0b4956c", 'latest']));
    // console.log(await provider2.send("eth_getBalance", [from, 'latest']));
    // console.log(await provider2.send("eth_getBalance", ["0x3fab184622dc19b6109349b94811493bf2a45362", 'latest']));
    
    const bytecode = '0x604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3'
    //6080604052348015600f57600080fd5b5060848061001e6000396000f3fe6080604052348015600f57600080fd5b506004361060285760003560e01c8063c3cafc6f14602d575b600080fd5b6033604f565b604051808260ff1660ff16815260200191505060405180910390f35b6000602a90509056fea165627a7a72305820ab7651cb86b8c1487590004c2444f26ae30077a6b96c6bc62dda37f1328539250029
    const factory = new ethers.ContractFactory([], bytecode, provider.getSigner());
    const contract = await factory.deploy();
    console.log(`Contract address: ${contract.address}`);
    
    // const txHash = await provider2.send("eth_sendRawTransaction", ["0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222"]);
    // const txHash = await provider2.send("eth_sendTransaction", ["0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222"]);

    console.log('deployed', contract)
  }

  if (hre.network.name == 'mantle_testnet') {
    console.log(await new Create2FactoryMantle(ethers.provider).deployFactory())
  } else {
    await new Create2Factory(ethers.provider).deployFactory()
  }

  console.log('deply EntryPoint')
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
