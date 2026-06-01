import "sharding"
import "storage"

fun calcDeployedJettonWallet(
    ownerAddress: address,
    minterAddress: address,
    jettonWalletCode: cell,
    platformTreasury: address?,
    transferFeeBps: uint16,
): AutoDeployAddress {
    val emptyWalletStorage: WalletStorage = {
        jettonBalance: 0,
        ownerAddress,
        minterAddress,
        platformTreasury,
        transferFeeBps,
    };

    return {
        workchain: MY_WORKCHAIN,
        stateInit: { code: jettonWalletCode, data: emptyWalletStorage.toCell() },
        toShard: { fixedPrefixLength: SHARD_DEPTH, closeTo: ownerAddress },
    };
}

fun calcAddressOfJettonWallet(
    ownerAddress: address,
    minterAddress: address,
    jettonWalletCode: cell,
    platformTreasury: address?,
    transferFeeBps: uint16,
): address {
    val jwDeployed = calcDeployedJettonWallet(
        ownerAddress,
        minterAddress,
        jettonWalletCode,
        platformTreasury,
        transferFeeBps,
    );
    return jwDeployed.calculateAddress();
}
