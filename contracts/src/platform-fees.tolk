import "errors"
import "fees-management"

/** Platform fee in basis points (100 = 1%, max 10000 = 100%). */
const MAX_TRANSFER_FEE_BPS: uint16 = 10000

fun calcJettonTransferFee(jettonAmount: coins, feeBps: uint16): coins {
    if (feeBps == 0) {
        return 0;
    }
    return jettonAmount * feeBps / MAX_TRANSFER_FEE_BPS;
}

fun platformFeeTransferActive(treasury: address?, feeBps: uint16): bool {
    return treasury != null && feeBps > 0;
}

fun checkAmountIsEnoughToTransferWithOptionalFee(
    msgValue: int,
    forwardTonAmount: int,
    fwdFee: int,
    chargesPlatformFee: bool,
) {
    val recipientMin = calcMinimalTransferAmount(forwardTonAmount, fwdFee);
    if (!chargesPlatformFee) {
        assert (msgValue > recipientMin) throw Errors.NotEnoughGas;
        return;
    }
    val feeMin = calcMinimalTransferAmount(0, fwdFee);
    // Each outbound internal transfer may deploy a wallet; both legs need full budget.
    assert (msgValue > recipientMin + feeMin) throw Errors.NotEnoughGas;
}

struct PlatformFeeTonSplit {
    recipientBudget: int
    feeBudget: int
}

fun splitTonForPlatformFeeTransfer(
    msgValue: int,
    forwardTonAmount: int,
    fwdFee: int,
): PlatformFeeTonSplit {
    val recipientMin = calcMinimalTransferAmount(forwardTonAmount, fwdFee);
    val feeMin = calcMinimalTransferAmount(0, fwdFee);
    val feeBudget = max(feeMin, (msgValue - recipientMin) / 2);
    return {
        recipientBudget: msgValue - feeBudget,
        feeBudget,
    };
}
