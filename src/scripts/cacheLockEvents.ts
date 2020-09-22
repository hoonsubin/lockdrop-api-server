import fs from 'fs';
import { EthLockdrop, Utils } from '../helper';
import { firstLockContract, secondLockContract } from '../data/lockdropContracts';
import Web3 from 'web3';

async function updateLockdropCache(web3: Web3, contractAddress: string) {
    // cache names are based on contract address
    const cacheFileDir = `cache/cache-${contractAddress.slice(0, 6)}.json`;

    // load cache or an empty array
    const _prevLocks = Utils.loadCache(cacheFileDir);

    console.log('Fetching events for ' + contractAddress);
    const newEv = await EthLockdrop.getAllLockEvents(web3, contractAddress, _prevLocks);

    const jsonBlob = JSON.stringify(newEv);

    fs.writeFile(cacheFileDir, jsonBlob, function (err) {
        if (err) return console.error(err);
        const _evDiff = newEv.length - _prevLocks.length;
        if (_evDiff > 0) console.info(`Fetched ${_evDiff} new events from etherscan`);
    });
}

async function updateAllContracts(web3: Web3) {
    const chainName = await web3.eth.net.getNetworkType();
    const _contracts = [...firstLockContract, ...secondLockContract].filter((i) => {
        return i.type === chainName;
    });

    if (!Array.isArray(_contracts) || _contracts.length === 0) {
        throw new Error('Could not find any contract address!');
    }

    const contractAddresses = _contracts.map((i) => {
        return i.address;
    });

    for (let i = 0; i < contractAddresses.length; i++) {
        try {
            await updateLockdropCache(web3, contractAddresses[i]);
        } catch (e) {
            console.error(e.message);
            console.log('Encountered error, skipping ' + contractAddresses[i]);
            continue;
        }
    }
}

// script entry point
(async () => {
    const networkType = process.argv[2].match('mainnet') ? 'mainnet' : 'ropsten';

    const web3 = new Web3(EthLockdrop.infuraHttpProvider(networkType));
    await updateAllContracts(web3);
})().catch((err) => {
    console.log(err);
});
