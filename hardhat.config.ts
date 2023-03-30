import '@nomiclabs/hardhat-waffle'
import '@typechain/hardhat'
import { HardhatUserConfig } from 'hardhat/config'
import 'hardhat-deploy'
import '@nomiclabs/hardhat-etherscan'

import 'solidity-coverage'

import * as fs from 'fs'

const mnemonicFileName =
  process.env.MNEMONIC_FILE ??
  `${process.env.HOME}/.secret/testnet-mnemonic.txt`
let mnemonic = 'test '.repeat(11) + 'junk'
if (fs.existsSync(mnemonicFileName)) {
  mnemonic = fs.readFileSync(mnemonicFileName, 'ascii')
}

function getNetwork1 (url: string): {
  url: string
  accounts: { mnemonic: string }
} {
  return {
    url,
    accounts: { mnemonic }
  }
}

function getNetwork (name: string): {
  url: string
  accounts: { mnemonic: string }
} {
  return getNetwork1(`https://${name}.infura.io/v3/${process.env.INFURA_ID}`)
  // return getNetwork1(`wss://${name}.infura.io/ws/v3/${process.env.INFURA_ID}`)
}

const optimizedComilerSettings = {
  version: '0.8.17',
  settings: {
    optimizer: { enabled: true, runs: 1000000 },
    viaIR: true
  }
}

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.15',
        settings: {
          optimizer: { enabled: true, runs: 1000000 }
        }
      }
    ],
    overrides: {
      'contracts/core/EntryPoint.sol': optimizedComilerSettings,
      'contracts/samples/SimpleAccount.sol': optimizedComilerSettings
    }
  },
  networks: {
    dev: { url: 'http://localhost:8545' },
    // github action starts localgeth service, for gas calculations
    localgeth: { url: 'http://localhost:8545' },
    mumbai: {
      url: 'https://rpc-mumbai.maticvigil.com',
      accounts: { mnemonic }
    },
    base_testnet: {
      url: 'https://goerli.base.org',
      accounts: { mnemonic }
    },    
    zkEVM: {
      url: `https://rpc.public.zkevm-test.net`,
      // chainId: 1442
      accounts: { mnemonic }
    },
    scroll_alpha: {
      url: 'https://alpha-rpc.scroll.io/l2',
      // chainId: 534353,
      accounts: { mnemonic }
    },
    gnosis: {
      url: 'https://rpc.gnosischain.com',
      accounts: { mnemonic }
    },
    chiado: {
      url: 'https://rpc.chiadochain.net',
      gasPrice: 1000000000,
      accounts: { mnemonic }
    },
    zksync_era_testnet: {
      url: 'https://testnet.era.zksync.dev',
      accounts: { mnemonic }
    },
    optimism_goerli: {
      // chainId: 420,
      url: 'https://goerli.optimism.io',
      accounts: {
        mnemonic: 'test test test test test test test test test test test junk'
      }
    },
    mantle_testnet: {
      // chainId: 5001,
      url: 'https://rpc.testnet.mantle.xyz',
      accounts: { mnemonic }
    },
    goerli: getNetwork('goerli'),
    sepolia: getNetwork('sepolia'),
    proxy: getNetwork1('http://localhost:8545')
  },
  mocha: {
    timeout: 10000
  },

  // deterministicDeployment: (network: string) => {
  //   console.log('determine net', network)
  //   return {
  //     factory: '0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7',
  //     deployer: '0xE1CB04A0fA36DdD16a06ea828007E35e1a3cBC37',
  //     funding: '100e9',
  //     signedTx: '0xf8a680830f4240830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf383104ec6a0ace7bece23b6d9db3563ef46bef4934922a9ded4ada6454f9cf6a179278bfcb9a03e3d8932a8405fbef4b0d734ebddd69935bf0d29aec15e07dabdbe2a31091e75',
  //   }
  // },
  deterministicDeployment: {
    534353: {
      // scroll_alpha: {
      factory: '0x914d7Fec6aaC8cd542e72Bca78B30650d45643d7',
      deployer: '0xE1CB04A0fA36DdD16a06ea828007E35e1a3cBC37',
      funding: '100000',
      signedTx:
        '0xf8a680830f4240830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf383104ec6a0ace7bece23b6d9db3563ef46bef4934922a9ded4ada6454f9cf6a179278bfcb9a03e3d8932a8405fbef4b0d734ebddd69935bf0d29aec15e07dabdbe2a31091e75'
    },
    5001: {
      // mantle_testnet: {
      factory: '0x6b97f5d88bf547C3aA3EC1D4F548ABCFf0AEeF8a',
      deployer: '0x9230891a2f0d2c78Fb14F33d28AB6C1E3754AE1D',
      funding: '100000',
      signedTx:
        '0xf8a20e01830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf3822736a0bd51ba86d0aa2e2ec6d09939332a199bff83864d01b390cb47faff2f96b770b0a05bbdac2728f411a351af78e131e0dbae0170a8ddf7a56179d31245405de15062'
    }  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  }
}

// coverage chokes on the "compilers" settings
if (process.env.COVERAGE != null) {
  // @ts-ignore
  config.solidity = config.solidity.compilers[0]
}

export default config
