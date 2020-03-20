const truffleAssert = require('truffle-assertions');
const EnergyTrading = artifacts.require("EnergyTrading");

contract("EnergyTrading e2e tests", async accounts => {
	let contract;

    beforeEach(async () => {
        contract = await EnergyTrading.new();
        let ttp = await contract.ttp(function(err, res) { return res; });
		assert.equal(ttp, accounts[0]);

		// initialize three households
		await contract.registerHousehold.sendTransaction(accounts[1]);
		await contract.mintEuroToken.sendTransaction(accounts[1], 1000000000000000);
		await contract.registerHousehold.sendTransaction(accounts[2]);
		await contract.mintEuroToken.sendTransaction(accounts[2], 1000000000000000);
		await contract.registerHousehold.sendTransaction(accounts[3]);
		await contract.mintEuroToken.sendTransaction(accounts[3], 1000000000000000);
		await contract.registerHousehold.sendTransaction(accounts[4]);
		await contract.mintEuroToken.sendTransaction(accounts[4], 1000000000000000);
		await contract.registerHousehold.sendTransaction(accounts[5]);
		await contract.mintEuroToken.sendTransaction(accounts[5], 1000000000000000);
		await contract.registerHousehold.sendTransaction(accounts[6]);
		await contract.mintEuroToken.sendTransaction(accounts[6], 1000000000000000);
    });

    it("E2E test", async () => {
    	// step 1: initialize roles
    	await contract.initializeRole.sendTransaction(false, {"from": accounts[1]});
    	await contract.initializeRole.sendTransaction(false, {"from": accounts[2]});
    	await contract.initializeRole.sendTransaction(false, {"from": accounts[3]});
    	await contract.initializeRole.sendTransaction(true, {"from": accounts[4]});
    	await contract.initializeRole.sendTransaction(true, {"from": accounts[5]});
    	await contract.initializeRole.sendTransaction(true, {"from": accounts[6]});

    	// step 2: store clearing results
    	let clearingResults1 = [3500000, 22225000, 0, 0, 1000000, 6350000, 2900000, 18415000, 1622000, 10299700, 0, 0, 1622000, 14598000, 0, 0, 1000000, 9000000, 1000000, 9000000, 1625000, 14625000, 0, 0, 1490000, 18997500, 124000, 1581000, 0, 0, 0, 0, 1625000, 20718750, 0, 0, 990000, 12622500, 621000, 7917750, 0, 0, 0, 0, 1625000, 20718750, 0, 0];
    	let clearingResults2 = [3490000, 22161500, 0, 0, 1000000, 6350000, 2890000, 18351500, 1625000, 10318750, 0, 0, 1622000, 14598000, 0, 0, 1000000, 9000000, 990000, 8910000, 1625000, 14625000, 0, 0, 1490000, 18997500, 125000, 1593750, 0, 0, 0, 0, 1625000, 20718750, 0, 0, 990000, 12622500, 622000, 7930500, 0, 0, 0, 0, 1625000, 20718750, 0, 0]
    	let clearingResults3 = [3500000, 22225000, 0, 0, 1000000, 6350000, 2900000, 18415000, 1622000, 10299700, 0, 0, 1622000, 14598000, 0, 0, 1000000, 9000000, 1000000, 9000000, 1625000, 14625000, 0, 0, 1490000, 18997500, 124000, 1581000, 0, 0, 0, 0, 1625000, 20718750, 0, 0, 990000, 12622500, 621000, 7917750, 0, 0, 0, 0, 1625000, 20718750, 0, 0]
    	let clearingResults4 = [3500000, 17850000, 0, 0, 1000000, 5980000, 2910000, 19924000, 1600000, 21600000, 0, 0, 1610000, 13085000, 0, 0, 1000000, 5980000, 1000000, 8700000, 1625000, 21937500, 0, 0, 1510000, 15251000, 125000, 1500000, 0, 0, 0, 0, 1625000, 21937500, 0, 0, 1020000, 6436000, 615000, 7380000, 0, 0, 0, 0, 1625000, 21937500, 0, 0]
    	let clearingResults5 = [3490000, 17787000, 0, 0, 1000000, 5980000, 2870000, 19668000, 1625000, 21937500, 0, 0, 1624000, 13204000, 0, 0, 1000000, 5980000, 990000, 8613000, 1625000, 21937500, 0, 0, 1120000, 11312000, 475000, 5700000, 0, 0, 0, 0, 1625000, 21937500, 0, 0, 1000000, 6300000, 619000, 7428000, 0, 0, 0, 0, 1625000, 21937500, 0, 0]
    	let clearingResults6 = [3430000, 21780500, 0, 0, 1000000, 6350000, 2850000, 18097500, 1625000, 10318750, 0, 0, 1615000, 14535000, 0, 0, 1000000, 9000000, 990000, 8910000, 1625000, 14625000, 0, 0, 1625000, 20718750, 0, 0, 0, 0, 0, 0, 1625000, 20718750, 0, 0, 860000, 10965000, 825900, 10530230, 0, 0, 0, 0, 1625000, 20718750, 0, 0]
    	await contract.storeClearingResults.sendTransaction(clearingResults1, 42980, 55, {"from": accounts[1]});
    	await contract.storeClearingResults.sendTransaction(clearingResults2, 43052, 50, {"from": accounts[2]});
    	await contract.storeClearingResults.sendTransaction(clearingResults3, 43085, 50, {"from": accounts[3]});
    	await contract.storeClearingResults.sendTransaction(clearingResults4, 42575, 45, {"from": accounts[4]});
    	await contract.storeClearingResults.sendTransaction(clearingResults5, 42340, 50, {"from": accounts[5]});
    	let finalTx = await contract.storeClearingResults.sendTransaction(clearingResults6, 41735, 106, {"from": accounts[6]});

    	truffleAssert.eventNotEmitted(finalTx, 'ClearingResultsInvalid');
    	truffleAssert.eventEmitted(finalTx, 'ClearingResultsValid');

    	// check: we should now have exited the clearing phase
     	isClearing = await contract.isClearing(function(err, res) { return res; });
		assert.equal(isClearing, false);

		// step 3: the smart meter of account 1 has received incoming energy
		let payTx1 = await contract.receivedEnergy.sendTransaction({"from": accounts[4]});
		truffleAssert.eventEmitted(payTx1, 'PoolPayment');

		// check: the pool balance should be increased now
		let poolBalance = await contract.poolBalance(function(err, res) { return res; });
		assert.equal(poolBalance.toNumber(), 51577875000000);

		// step 4: the smart meter of account 5 and 6 has received incoming energy
		let payTx2 = await contract.receivedEnergy.sendTransaction({"from": accounts[5]});
		truffleAssert.eventEmitted(payTx2, 'PoolPayment');
		let payTx3 = await contract.receivedEnergy.sendTransaction({"from": accounts[6]});
		truffleAssert.eventEmitted(payTx3, 'PoolPayment');

		// check: the funds should have been re-distributed now and the next round should have been entered
		let tokenBalance = await contract.balanceOf.call(accounts[1]);
		assert.equal(tokenBalance.toNumber() > 1000000000000000, true);

		tokenBalance = await contract.balanceOf.call(accounts[2]);
		assert.equal(tokenBalance.toNumber() == 1000000000000000, true);

		tokenBalance = await contract.balanceOf.call(accounts[3]);
		assert.equal(tokenBalance.toNumber() > 1000000000000000, true);

		tokenBalance = await contract.balanceOf.call(accounts[4]);
		assert.equal(tokenBalance.toNumber() < 1000000000000000, true);

		tokenBalance = await contract.balanceOf.call(accounts[5]);
		assert.equal(tokenBalance.toNumber() < 1000000000000000, true);

		tokenBalance = await contract.balanceOf.call(accounts[6]);
		assert.equal(tokenBalance.toNumber() == 1000000000000000, true);
	});
});