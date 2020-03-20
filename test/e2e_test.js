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
		await contract.mintEuroToken.sendTransaction(accounts[1], 100);
		await contract.registerHousehold.sendTransaction(accounts[2]);
		await contract.mintEuroToken.sendTransaction(accounts[2], 100);
		await contract.registerHousehold.sendTransaction(accounts[3]);
		await contract.mintEuroToken.sendTransaction(accounts[3], 100);
    });

    it("E2E test", async () => {
    	// step 1: initialize roles
    	await contract.initializeRole.sendTransaction(true, {"from": accounts[1]});
    	await contract.initializeRole.sendTransaction(true, {"from": accounts[2]});
    	await contract.initializeRole.sendTransaction(false, {"from": accounts[3]});

    	// step 2: store clearing results
    	let clearingResults = [4, 5, 4, 5, 8, 5, 4, 5, 4, 5, 8, 5, 4, 5, 4, 5, 8, 5, 4, 5, 4, 5, 8, 5];
    	await contract.storeClearingResults.sendTransaction(clearingResults, 1, 1, {"from": accounts[1]});
    	await contract.storeClearingResults.sendTransaction(clearingResults, 1, 1, {"from": accounts[2]});
    	await contract.storeClearingResults.sendTransaction(clearingResults, 1, 1, {"from": accounts[3]});

    	// check: we should now have exited the clearing phase
    	isClearing = await contract.isClearing(function(err, res) { return res; });
		assert.equal(isClearing, false);

		// step 3: the smart meter of account 1 has received incoming energy
		await contract.receivedEnergy.sendTransaction({"from": accounts[1]});

		// check: the pool balance should be increased now
		let poolBalance = await contract.poolBalance(function(err, res) { return res; });
		assert.equal(poolBalance.toNumber(), 20);

		// step 4: the smart meter of account 2 has received incoming energy
		await contract.receivedEnergy.sendTransaction({"from": accounts[2]});

		// check: the funds should have been re-distributed now and the next round should have been entered
		let tokenBalance = await contract.balanceOf.call(accounts[1]);
		assert.equal(tokenBalance.toNumber(), 80);

		tokenBalance = await contract.balanceOf.call(accounts[2]);
		assert.equal(tokenBalance.toNumber(), 80);

		tokenBalance = await contract.balanceOf.call(accounts[3]);
		assert.equal(tokenBalance.toNumber(), 140);

		poolBalance = await contract.poolBalance(function(err, res) { return res; });
		assert.equal(poolBalance.toNumber(), 0);
	});
});