import { NextRequest, NextResponse } from 'next/server'
import { ethers } from 'ethers'
import { NETWORKS, NETWORK_CHAIN_IDS, NetworkKey } from '@/lib/network'

const ERC20_ABI = [
  "event Transfer(address indexed from, address indexed to, uint256 value)",
  "function balanceOf(address) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)",
  "function name() view returns (string)"
]

export async function POST(request: NextRequest) {
  try {
    const { address, chainId } = await request.json()

    if (!address || !chainId) {
      return NextResponse.json(
        { error: 'Address and chain ID are required' },
        { status: 400 }
      )
    }

    // Find network config by chain ID
    const networkKey = Object.keys(NETWORK_CHAIN_IDS).find(
      key => NETWORK_CHAIN_IDS[key as NetworkKey] === chainId
    ) as NetworkKey | undefined

    if (!networkKey) {
      return NextResponse.json(
        { error: `Unsupported chain ID: ${chainId}` },
        { status: 400 }
      )
    }

    const networkConfig = NETWORKS[networkKey]
    const rpcUrl = networkConfig.chain.rpcUrls.default.http[0]
    const nativeToken = networkConfig.chain.nativeCurrency

    console.log(`Fetching tokens for address ${address} on ${networkConfig.chain.name} (chain ${chainId}) using RPC: ${rpcUrl}`)
    const provider = new ethers.JsonRpcProvider(rpcUrl)

    const latestBlock = await provider.getBlockNumber()
    const transferTopic = ethers.id("Transfer(address,address,uint256)")
    const maxBlocksToScan = 500

    // Get logs where address is sender
    const logsFrom = await provider.getLogs({
      fromBlock: Math.max(1, latestBlock - maxBlocksToScan),
      toBlock: latestBlock,
      topics: [
        transferTopic,
        ethers.zeroPadValue(address, 32)
      ]
    })

    // Get logs where address is receiver
    const logsTo = await provider.getLogs({
      fromBlock: Math.max(1, latestBlock - maxBlocksToScan),
      toBlock: latestBlock,
      topics: [
        transferTopic,
        null,
        ethers.zeroPadValue(address, 32)
      ]
    })

    const allTokenAddresses = new Set<string>()
    ;[...logsFrom, ...logsTo].forEach(log => {
      allTokenAddresses.add(log.address.toLowerCase())
    })

    // Fetch balances for all tokens (excluding USDC as we'll add it explicitly later)
    const tokensWithBalance = []
    const usdcAddressLower = networkConfig.usdcAddress.toLowerCase()

    for (const tokenAddr of allTokenAddresses) {
      // Skip USDC here as we'll add it explicitly later
      if (tokenAddr === usdcAddressLower) continue
      
      try {
        const contract = new ethers.Contract(tokenAddr, ERC20_ABI, provider)
        const bal = await contract.balanceOf(address)
        
        if (bal === 0n) continue

        const [symbol, decimals, name] = await Promise.all([
          contract.symbol().catch(() => "UNKNOWN"),
          contract.decimals().catch(() => 18),
          contract.name().catch(() => "Unknown Token")
        ])

        tokensWithBalance.push({
          symbol,
          name,
          address: tokenAddr,
          balance: ethers.formatUnits(bal, decimals),
          balanceRaw: bal.toString(),
          decimals: Number(decimals)
        })
      } catch (err) {
        console.error(`Error fetching token ${tokenAddr}:`, err)
      }
    }

    // Always fetch and include native token balance
    const nativeBal = await provider.getBalance(address)
    
    // Add native token to the tokens array (first position)
    tokensWithBalance.unshift({
      symbol: nativeToken.symbol,
      name: nativeToken.name,
      address: "0x0000000000000000000000000000000000000000",
      balance: ethers.formatUnits(nativeBal, nativeToken.decimals),
      balanceRaw: nativeBal.toString(),
      decimals: nativeToken.decimals
    })

    // Always fetch and include USDC balance from network config
    try {
      const usdcContract = new ethers.Contract(networkConfig.usdcAddress, ERC20_ABI, provider)
      const usdcBal = await usdcContract.balanceOf(address)
      
      const [usdcSymbol, usdcName] = await Promise.all([
        usdcContract.symbol().catch(() => "USDC"),
        usdcContract.name().catch(() => "USD Coin")
      ])

      // Add USDC after native token (second position)
      tokensWithBalance.splice(1, 0, {
        symbol: usdcSymbol,
        name: usdcName,
        address: networkConfig.usdcAddress.toLowerCase(),
        balance: ethers.formatUnits(usdcBal, networkConfig.usdcDecimals),
        balanceRaw: usdcBal.toString(),
        decimals: networkConfig.usdcDecimals
      })
    } catch (err) {
      console.error('Error fetching USDC balance:', err)
    }
    
    return NextResponse.json({
      tokens: tokensWithBalance,
      nativeBalance: {
        symbol: nativeToken.symbol,
        name: nativeToken.name,
        balance: ethers.formatUnits(nativeBal, nativeToken.decimals),
        balanceRaw: nativeBal.toString(),
        decimals: nativeToken.decimals,
        address: "0x0000000000000000000000000000000000000000"
      }
    })

  } catch (error: any) {
    console.error('Error in native and USDC token API:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch tokens' },
      { status: 500 }
    )
  }
}
