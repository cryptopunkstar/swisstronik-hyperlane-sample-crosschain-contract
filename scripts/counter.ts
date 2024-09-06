import {ethers} from "hardhat";


async function main() {
  // Construct instance of SampleCrossChainCounter in Amoy
  const provider = new ethers.JsonRpcProvider(process.env.AMOY_RPC);
  const wallet = new ethers.Wallet(process.env.DEPLOYER_KEY!);
  const signer = wallet.connect(provider);

  const contract = await ethers.getContractAt("SampleCrossChainCounter", process.env.AMOY_CONTRACT_ADDRESS!, signer);

  const counterValue = await contract.counter();
  console.log('Counter value in Amoy: ', counterValue.toString());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
