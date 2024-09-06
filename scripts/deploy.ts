import { ethers } from "hardhat";
import { encryptDataField } from "@swisstronik/swisstronik.js";

const SWISSTRONIK_CHAIN_ID = 1291;
const AMOY_CHAIN_ID = 80001;

const SWISSTRONIK_MAILBOX = "0xF12c1fA2ca4a0EB6051591B57250Cf44bFd242Bf";
// We're using empty addresses for Swisstronik since Amoy can be understood by default hook
const SWISSTRONIK_MERKLE_TREE_HOOK = ethers.ZeroAddress;
const SWISSTRONIK_ISM = "0x6289Ab10eE0Ff1bF222e740A7AE3FF79A9e27110";

const AMOY_MERKLE_TREE_HOOK = "0x9AF85731EDd41E2E50F81Ef8a0A69D2fB836EDf9";
const AMOY_MAILBOX = "0x2d1889fe5B092CD988972261434F7E5f26041115";
const AMOY_ISM = "0xb27a1acE410bc221039225276255Aff8ef8d2b1C";

async function main() {
  if (!process.env.DEPLOYER_KEY) {
    console.log('Please specify DEPLOYER_KEY in .env file');
    throw new Error('DEPLOYER_KEY is empty');
  }

  console.log('Preparing signers for both networks');
  const wallet = new ethers.Wallet(process.env.DEPLOYER_KEY);
  const amoyProvider = new ethers.JsonRpcProvider(process.env.AMOY_RPC);
  const swisstronikProvider = new ethers.JsonRpcProvider(process.env.SWISSTRONIK_RPC);
  const amoySigner = wallet.connect(amoyProvider);
  const swisstronikSigner = wallet.connect(swisstronikProvider);

  console.log('Deploying SampleCrossChainCounter to Swisstronik');
  const swtrContract = await ethers.deployContract(
    "SampleCrossChainCounter",
    [
      SWISSTRONIK_MAILBOX,
      SWISSTRONIK_MERKLE_TREE_HOOK,
      AMOY_CHAIN_ID, // destination chain id,
      SWISSTRONIK_ISM,
    ],
    swisstronikSigner,
  );
  await swtrContract.waitForDeployment();

  console.log('Deploying SampleCrossChainCounter to Polygon Amoy');
  const amoyContract = await ethers.deployContract(
    "SampleCrossChainCounter",
    [
      AMOY_MAILBOX,
      AMOY_MERKLE_TREE_HOOK,
      SWISSTRONIK_CHAIN_ID, // destination chain id
      AMOY_ISM,
    ],
    amoySigner,
  );
  await amoyContract.waitForDeployment();

  console.log('Configure recipient address in Swisstronik');
  const swisstronikContractAddress = await swtrContract.getAddress();
  const amoyContractAddress = await amoyContract.getAddress();

  const encodedSwtrTxData = swtrContract.interface.encodeFunctionData(
    "setCounterContractInOtherChain",
    [amoyContractAddress]
  );

  await sendShieldedTransaction(
    swisstronikSigner, 
    swisstronikContractAddress,
    encodedSwtrTxData,
    0
  );

  console.log('Configure recipient address in Polygon Amoy');
  await amoyContract.setCounterContractInOtherChain(swisstronikContractAddress);

  console.log('Contracts were deployed');
  console.log('Swisstronik: ', swisstronikContractAddress);
  console.log('Amoy: ', amoyContractAddress);
}

const sendShieldedTransaction = async (
  signer: any,
  destination: string,
  data: string,
  value: number
) => {

  const rpclink = process.env.SWISSTRONIK_RPC;

  // Encrypt transaction data
  const [encryptedData] = await encryptDataField(rpclink!, data);

  // Construct and sign transaction with encrypted data
  return await signer.sendTransaction({
    from: signer.address,
    to: destination,
    data: encryptedData,
    value,
  });
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
