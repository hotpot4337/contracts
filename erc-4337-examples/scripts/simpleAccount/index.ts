#!/usr/bin/env node
import { Command } from "commander";
import address from "./address";
import transfer from "./transfer";
import swap from "./swap";
import createFlow from "./createFlow";
import wCreateFlow from "./wCreateFlow";
import deleteFlow from "./deleteFlow";
import erc20Balance from "./erc20Balance";
import erc20Transfer from "./erc20Transfer";
import batchTransfer from "./batchTransfer";
import batchErc20Transfer from "./batchErc20Transfer";

const program = new Command();

program
  .name("ERC-4337 SimpleAccount")
  .description(
    "A collection of example scripts for working with ERC-4337 SimpleAccount.sol"
  )
  .version("0.1.0");

program
  .command("address")
  .description("Generate a counterfactual address.")
  .action(address);

program
  .command("transfer")
  .description("Transfer ETH")
  .option("-pm, --withPaymaster", "Use a paymaster for this transaction")
  .requiredOption("-t, --to <address>", "The recipient address")
  .requiredOption("-amt, --amount <eth>", "Amount in ETH to transfer")
  .action(async (opts) =>
    transfer(opts.to, opts.amount, Boolean(opts.withPaymaster))
  );

program
  .command("swap")
  .description("Uniswap ETH")
  .option("-pm, --withPaymaster", "Use a paymaster for this transaction")
  .requiredOption("-amt, --amount <eth>", "Amount in ETH to transfer")
  .action(async (opts) =>
    swap(opts.amount, Boolean(opts.withPaymaster))
  );

program
  .command("createFlow")
  .description("Create Superfluid flow")
  .option("-pm, --withPaymaster", "Use a paymaster for this transaction")
  .requiredOption("-tkn, --token <address>", "The token address")
  .requiredOption("-t, --to <address>", "The recipient address")
  .requiredOption("-amt, --amount <decimal>", "Amount of the token to transfer per second")
  .action(async (opts) =>
    createFlow(opts.token, opts.to, opts.amount, Boolean(opts.withPaymaster))
  );

program
  .command("wCreateFlow")
  .description("Wrap (upgrade to Super) token and Create Superfluid flow")
  .option("-pm, --withPaymaster", "Use a paymaster for this transaction")
  .requiredOption("-tkn, --token <address>", "The Super token address")
  .requiredOption("-t, --to <address>", "The recipient address")
  .requiredOption("-amt, --amount <decimal>", "Amount of the token to transfer per second")
  .action(async (opts) =>
    wCreateFlow(opts.token, opts.to, opts.amount, Boolean(opts.withPaymaster))
  );

program
  .command("deleteFlow")
  .description("Transfer ERC-20 token")
  .option("-pm, --withPaymaster", "Use a paymaster for this transaction")
  .requiredOption("-tkn, --token <address>", "The token address")
  .requiredOption("-t, --to <address>", "The recipient address")
  .action(async (opts) =>
    deleteFlow(opts.token, opts.to, Boolean(opts.withPaymaster))
  );

program
  .command("erc20Balance")
  .description("Balance of ERC-20 token")
  .requiredOption("-tkn, --token <address>", "The token address")
  .action(async (opts) =>
    erc20Balance(opts.token)
  );

program
  .command("erc20Transfer")
  .description("Transfer ERC-20 token")
  .option("-pm, --withPaymaster", "Use a paymaster for this transaction")
  .requiredOption("-tkn, --token <address>", "The token address")
  .requiredOption("-t, --to <address>", "The recipient address")
  .requiredOption("-amt, --amount <decimal>", "Amount of the token to transfer")
  .action(async (opts) =>
    erc20Transfer(opts.token, opts.to, opts.amount, Boolean(opts.withPaymaster))
  );

program
  .command("batchTransfer")
  .description("Batch transfer ETH")
  .option("-pm, --withPaymaster", "Use a paymaster for this transaction")
  .requiredOption(
    "-t, --to <addresses>",
    "Comma separated list of recipient addresses"
  )
  .requiredOption("-amt, --amount <eth>", "Amount in ETH to transfer")
  .action(async (opts) =>
    batchTransfer(opts.to.split(","), opts.amount, Boolean(opts.withPaymaster))
  );

program
  .command("batchErc20Transfer")
  .description("Batch transfer ERC-20 token")
  .option("-pm, --withPaymaster", "Use a paymaster for this transaction")
  .requiredOption("-tkn, --token <address>", "The token address")
  .requiredOption(
    "-t, --to <addresses>",
    "Comma separated list of recipient addresses"
  )
  .requiredOption("-amt, --amount <decimal>", "Amount of the token to transfer")
  .action(async (opts) =>
    batchErc20Transfer(
      opts.token,
      opts.to.split(","),
      opts.amount,
      Boolean(opts.withPaymaster)
    )
  );

program.parse();
