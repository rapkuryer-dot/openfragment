import "@acton/emulation/network"
import "@acton/emulation/testing"
import "@acton/testing/expect"
import "@contracts/messages"
import "@wrappers/JettonMinter.gen"
import "@wrappers/JettonWallet.gen"
import "@wrappers/utils"

import "test-utils"

const FEE_BPS = 100 // 1%

get fun `test platform: owner transfer should send fee to treasury wallet`() {
    val treasury = testing.treasury("platform-treasury");
    val (minter, deployer, _) = setupTestWithPlatformFee(treasury.address, FEE_BPS);
    val senderWallet = mintTo(minter, deployer, deployer.address, ton("1000"));
    val recipient = testing.treasury("fee-recipient");
    val treasuryWallet = userWallet(minter, treasury.address);

    val transferAmount = ton("100");
    val expectedFee = transferAmount * FEE_BPS / 10000;
    val expectedRecipient = transferAmount - expectedFee;

    val body = buildTransferBody(
        transferAmount,
        0,
        recipient.address,
        deployer.address,
        makeTinyForwardPayload(),
    );
    val res = sendRawTransferPayload(
        deployer.address,
        senderWallet.address,
        body.toCell(),
        ton("1"),
    );
    expect(res).toHaveSuccessfulTx<AskToTransfer>({
        from: deployer.address,
        to: senderWallet.address,
    });
    expect(res).toHaveSuccessfulTx<InternalTransferStep>({
        from: senderWallet.address,
        to: treasuryWallet.address,
    });

    expect(senderWallet.getJettonBalance()).toEqual(ton("1000") - transferAmount);
    expect(treasuryWallet.getJettonBalance()).toEqual(expectedFee);
    expect(userWallet(minter, recipient.address).getJettonBalance()).toEqual(expectedRecipient);
}

fun setupTestWithPlatformFee(treasury: address, feeBps: uint16): (JettonMinter, Treasury, Treasury) {
    val deployer = testing.treasury("deployer-fee");
    val notDeployer = testing.treasury("notDeployer-fee");

    val minter = JettonMinter.fromStorage({
        totalSupply: 0,
        adminAddress: deployer.address,
        metadata: buildTestMetadata("fee-link"),
        nextAdminAddress: null,
        platformTreasury: treasury,
        transferFeeBps: feeBps,
    });

    val transactions = minter.sendDeploy(deployer.address, { value: ton("10") });
    expect(transactions).toHaveSuccessfulDeploy({
        to: minter.address,
    });

    return (minter, deployer, notDeployer);
}
