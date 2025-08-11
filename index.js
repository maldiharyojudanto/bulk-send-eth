import { Web3 } from "web3";
import fs from "fs";
import chalk from "chalk";
import { ethers, formatEther, parseUnits } from "ethers";

/*
- Check the RPC, 
- your main private key (sender), 
- amount in decimal (check the rpc decimal), and
- convert amount in wei (ether => wei or gwei => wei or else)
goodluck
*/

const PACKAGE = 1 // 1=web3js, 2=ethers
const RPC_URL = "https://zenchain-testnet.api.onfinality.io/public" // blockchain rpc url
const PRIVATE_KEY = "" // your pkey
const AMOUNT = "0.1" // in ether format example 0.1 or 0.001

const TICKER_COIN = "ZEN" //optional
const BLOCK_SCANNER = "https://zentrace.io/" // optional, example: https://zentrace.io/

async function main() {
    console.log("📦 Bulk Send ETH")

    try {
        const data = fs.readFileSync('address.txt', 'utf-8');
        const addressData = data.split('\n')
        
        if (PACKAGE == 1) {
            // connect RPC 
            const web3 = new Web3(RPC_URL)
            const account = web3.eth.accounts.privateKeyToAccount(PRIVATE_KEY)

            // amount send
            const amount = AMOUNT
            const amountWei = web3.utils.toWei(amount, 'ether') // ether <> wei 10**18 standart decimal evm token 

            console.log(`\n🔗 Chain Id: ${chalk.yellow(web3.utils.toNumber(await web3.eth.getChainId()))} (${web3.utils.toHex(await web3.eth.getChainId())})`)
            
            for (const address of addressData) {
                if(address!="") {
                    const to = address.trim()
                    while(true) {
                        // get balance address coin
                        const balanceAcc = await web3.eth.getBalance(account.address)
                        let saldo = web3.utils.fromWei(balanceAcc, 'ether')
                        // console.log(saldo)

                        console.log(`\n🔑 EVM address: ${chalk.green(account.address)}\n🏦 Saldo: ${chalk.yellow(`${Number(saldo)} ${TICKER_COIN}`)}`)
                        console.log(`📤 Send to: ${chalk.green(address)}`)

                        // estimasi gas
                        const gastEst = await web3.eth.estimateGas({
                            from: account.address,
                            to: to,
                            value: amountWei
                        })

                        const feeData = await web3.eth.calculateFeeData()
                        
                        try {
                            // raw tx
                            const tx = {
                                from: account.address,
                                to: to,
                                value: amountWei,
                                gas: gastEst,
                                maxFeePerGas: feeData.maxFeePerGas,
                                maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
                                nonce: await web3.eth.getTransactionCount(account.address),
                            }
                
                            // sign tx
                            const signedTransaction = await web3.eth.accounts.signTransaction(
                                tx,
                                account.privateKey,
                            );

                            try {
                                const receipt = await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);
                                console.log(`   Transaction hash: ${chalk.green(`${BLOCK_SCANNER==""?"":BLOCK_SCANNER+"tx/"}${receipt.transactionHash}`)}`);
                                console.log(`   Transaction fee: ${chalk.yellow(`${web3.utils.fromWei(receipt.effectiveGasPrice * receipt.gasUsed, 'ether')} ${TICKER_COIN}`)}`)
                                const txStat = await web3.eth.getTransactionReceipt(receipt.transactionHash)
                                
                                if (web3.utils.toNumber(txStat.status) == 1) {
                                    break
                                }
                            } catch (err) {
                                console.log(chalk.red(`⛔ ${err.message}`))
                            }
                        } catch (err) {
                            console.log(err.message)
                        }
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        } else if (PACKAGE == 2) {
            const provider = new ethers.JsonRpcProvider(RPC_URL);
            const account = new ethers.Wallet(PRIVATE_KEY, provider);

            for (const address of addressData) {
                if(address!="") {
                    const to = address.trim()
                    while(true) {
                        // get balance address coin
                        const balanceAcc = await provider.getBalance(account.address)
                        let saldo = formatEther(balanceAcc)
                        // console.log(saldo)

                        console.log(`\n🔑 EVM address: ${chalk.green(account.address)}\n🏦 Saldo: ${chalk.yellow(`${Number(saldo)} ${TICKER_COIN}`)}`)
                        console.log(`📤 Send to: ${chalk.green(address)}`)

                        // estimasi gas
                        const gaslimit = await provider.estimateGas({
                            from: account.address,
                            to: to,
                            value: parseUnits(AMOUNT, "ether"),
                        });

                        const feeData = await provider.getFeeData()
                        
                        try {
                            // raw tx
                            const tx = {
                                from: account.address,
                                to: to,
                                value: parseUnits(AMOUNT, "ether"),
                                gasLimit: gaslimit,
                                maxFeePerGas: feeData.maxFeePerGas,
                                maxPriorityFeePerGas: feeData.maxPriorityFeePerGas,
                                nonce: await account.getNonce(),
                            };

                            // sign tx                          
                            const sendTX = await account.sendTransaction(tx)

                            try {
                                const receipt = await sendTX.wait();;
                                console.log(`   Transaction hash: ${chalk.green(`${BLOCK_SCANNER==""?"":BLOCK_SCANNER+"tx/"}${receipt.hash}`)}`);
                                console.log(`   Transaction fee: ${chalk.yellow(`${formatEther(receipt.gasUsed*receipt.gasPrice)} ${TICKER_COIN}`)}`)

                                if (receipt.status == 1) {
                                    break
                                }
                            } catch (err) {
                                console.log(chalk.red(`⛔ ${err.message}`))
                            }
                        } catch (err) {
                            console.log(err.message)
                        }
                    }
                }

                await new Promise(resolve => setTimeout(resolve, 1000))
            }
        }
    } catch (e) {
        if (e.code == 'ENOENT') {
            console.log('📝 Fill the address.txt first!');
            fs.writeFileSync('address.txt', "0x123123\n0x123123\netc...")
            process.exit()
        } else {
            throw e
        }
    }
}

main()