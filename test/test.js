const truffleAssert = require('truffle-assertions');
const EnergyTrading = artifacts.require("EnergyTrading");

contract("EnergyTrading unit tests", async accounts => {
	let contract;

    beforeEach(async () => {
        contract = await EnergyTrading.new();
        let ttp = await contract.ttp(function(err, res) { return res; });
		assert.equal(ttp, accounts[0]);
    });

	it("test registration of households by a TTP", async () => {
		await contract.registerHousehold.sendTransaction(accounts[1]);
		let totalHouseholds = await contract.totalHouseholds(function(err, res) { return res; });
		assert.equal(totalHouseholds, 1);
	});

	it("test registration of households by a non-TTP", async () => {
		await truffleAssert.reverts(contract.registerHousehold.sendTransaction(accounts[0], {"from": accounts[1]}));
		let totalHouseholds = await contract.totalHouseholds(function(err, res) { return res; });
		assert.equal(totalHouseholds, 0);
	});

	it("test minting of EuroToken by a TTP", async () => {
		await contract.registerHousehold.sendTransaction(accounts[1]);
		await contract.mintEuroToken.sendTransaction(accounts[1], 1000);
		let tokenBalance = await contract.balanceOf.call(accounts[1]);
		assert.equal(tokenBalance, 1000);
	});

	it("test mining of EuroToken by a non-TTP", async () => {
		await contract.registerHousehold.sendTransaction(accounts[1]);
		await truffleAssert.reverts(contract.mintEuroToken.sendTransaction(accounts[1], 1000, {"from": accounts[1]}));
	});

	it("test minting of EuroToken by a TTP to a non-registered household", async () => {
		await contract.registerHousehold.sendTransaction(accounts[1]);
		await truffleAssert.reverts(contract.mintEuroToken.sendTransaction(accounts[2], 1000));
	});

	it("test getting the balance of EuroTokens", async () => {
		await truffleAssert.reverts(contract.balanceOf.call(accounts[0]));
		await contract.registerHousehold.sendTransaction(accounts[1]);
		let tokenBalance = await contract.balanceOf.call(accounts[1]);
		assert.equal(tokenBalance, 0);
	});

	it("test initializing the roles by an unregistered household", async () => {
		await truffleAssert.reverts(contract.initializeRole.sendTransaction(true));
	});

	it("test initializing the roles", async () => {
		await contract.registerHousehold.sendTransaction(accounts[1]);
		await contract.registerHousehold.sendTransaction(accounts[2]);
		await contract.initializeRole.sendTransaction(true, {"from": accounts[1]});

		let expectedTransfers = await contract.expectedTransfers(function(err, res) { return res; });
		assert.equal(expectedTransfers, 1);

		await contract.initializeRole.sendTransaction(false, {"from": accounts[2]});

		expectedTransfers = await contract.expectedTransfers(function(err, res) { return res; });
		assert.equal(expectedTransfers, 1);
	});

	it("test initializing the roles twice", async () => {
		await contract.registerHousehold.sendTransaction(accounts[1]);
		await contract.initializeRole.sendTransaction(true, {"from": accounts[1]});
		await truffleAssert.reverts(contract.initializeRole.sendTransaction(false, {"from": accounts[1]}));
	});

	it("test the storage of clearing results by a non-registered household", async () => {
		await truffleAssert.reverts(contract.storeClearingResults.sendTransaction([1, 2, 3, 4], 1, 1));
	});

	it("test the storage of clearing results with an invalid length", async () => {
		await contract.registerHousehold.sendTransaction(accounts[1]);
		await truffleAssert.reverts(contract.storeClearingResults.sendTransaction([1, 2, 3, 4], 1, 1, {"from": accounts[1]}));
	});

	it("test storing the clearing results twice", async () => {
		await contract.registerHousehold.sendTransaction(accounts[1]);
		await contract.storeClearingResults.sendTransaction([1, 2, 3, 4, 5, 6, 7, 8], 1, 1, {"from": accounts[1]}) // this should work
		await truffleAssert.reverts(contract.storeClearingResults.sendTransaction([1, 2, 3, 4, 5, 6, 7, 8], 1, 1, {"from": accounts[1]}));
	});

	it("test storing valid clearing results", async () => {
		await contract.registerHousehold.sendTransaction(accounts[1]);
		await contract.storeClearingResults.sendTransaction([1, 2, 3, 4, 5, 6, 7, 8], 1, 1, {"from": accounts[1]})
		
		let isClearing = await contract.isClearing(function(err, res) { return res; });
		assert.equal(isClearing, false);
	});

	it("test storing valid clearing results by two households", async () => {
		await contract.registerHousehold.sendTransaction(accounts[1]);
		await contract.registerHousehold.sendTransaction(accounts[2]);

		let clearingResults = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
		await contract.storeClearingResults.sendTransaction(clearingResults, 1, 1, {"from": accounts[1]});
		var isClearing = await contract.isClearing(function(err, res) { return res; });
		assert.equal(isClearing, true);

		contract.storeClearingResults.sendTransaction(clearingResults, 1, 1, {"from": accounts[2]});
		isClearing = await contract.isClearing(function(err, res) { return res; });
		assert.equal(isClearing, false);
	});

	it("test storing two clearing results that are not similar enough", async () => {
		await contract.registerHousehold.sendTransaction(accounts[1]);
		await contract.registerHousehold.sendTransaction(accounts[2]);

		let clearingResults1 = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]
		let clearingResults2 = [1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000]
		await contract.storeClearingResults.sendTransaction(clearingResults1, 1, 1, {"from": accounts[1]});
		var isClearing = await contract.isClearing(function(err, res) { return res; });
		assert.equal(isClearing, true);
		let clearingResultsReceived = await contract.clearingResultsReceived(function(err, res) { return res; });
		assert.equal(clearingResultsReceived, 1);

		contract.storeClearingResults.sendTransaction(clearingResults2, 1, 1, {"from": accounts[2]});

		// everything should have been reset now
		isClearing = await contract.isClearing(function(err, res) { return res; });
		assert.equal(isClearing, true);
		clearingResultsReceived = await contract.clearingResultsReceived(function(err, res) { return res; });
		assert.equal(clearingResultsReceived, 0);
	});

	it("test getting the energy price from the clearing results for an unregistered household", async () => {
		await truffleAssert.reverts(contract.getTotalPrice.sendTransaction(0, accounts[0]));
	});

	it("test getting the energy price from the clearing results for an household that have not published their clearing results yet", async () => {
		await contract.registerHousehold.sendTransaction(accounts[1]);
		await truffleAssert.reverts(contract.getTotalPrice.sendTransaction(0, accounts[1]));
	});

	it("test getting the energy price from the clearing results for an household for an invalid period", async () => {
		await contract.registerHousehold.sendTransaction(accounts[1]);
		await contract.storeClearingResults.sendTransaction([1, 2, 3, 4, 5, 6, 7, 8], 1, 1, {"from": accounts[1]});
		await truffleAssert.reverts(contract.getTotalPrice.sendTransaction(5, accounts[1]));
	});

	it("test getting the energy price from the clearing results", async () => {
		await contract.registerHousehold.sendTransaction(accounts[1]);
		await contract.storeClearingResults.sendTransaction([1, 2, 3, 4, 5, 6, 7, 8], 1, 1, {"from": accounts[1]});
		
		let totalPrice = await contract.getTotalPrice.call(0, accounts[1]);
		assert.equal(totalPrice.toNumber(), 2);

		totalPrice = await contract.getTotalPrice.call(1, accounts[1]);
		assert.equal(totalPrice.toNumber(), 12);

		totalPrice = await contract.getTotalPrice.call(2, accounts[1]);
		assert.equal(totalPrice.toNumber(), 30);

		totalPrice = await contract.getTotalPrice.call(3, accounts[1]);
		assert.equal(totalPrice.toNumber(), 56);
	});

	it("test receiving energy by an unregistered household", async () => {
		await truffleAssert.reverts(contract.receivedEnergy.sendTransaction());
	});

	it("test receiving energy while we are not in the clearing phase", async () => {
		await contract.registerHousehold.sendTransaction(accounts[1]);
		await truffleAssert.reverts(contract.receivedEnergy.sendTransaction());
	});

	it("test receiving energy while we have not set a role", async () => {
		await contract.registerHousehold.sendTransaction(accounts[1]);
		await contract.storeClearingResults.sendTransaction([1, 2, 3, 4, 5, 6, 7, 8], 1, 1, {"from": accounts[1]});
		await truffleAssert.reverts(contract.receivedEnergy.sendTransaction());
	});

	it("test receiving energy while we do not have sufficient funds", async () => {
		await contract.registerHousehold.sendTransaction(accounts[1]);
		await contract.storeClearingResults.sendTransaction([1, 2, 3, 4, 5, 6, 7, 8], 1, 1, {"from": accounts[1]});
		await contract.initializeRole.sendTransaction(true, {"from": accounts[1]});
		await truffleAssert.reverts(contract.receivedEnergy.sendTransaction());
	});

	it("test receiving energy while we already received energy", async () => {
		await contract.registerHousehold.sendTransaction(accounts[1]);
		await contract.storeClearingResults.sendTransaction([1, 2, 3, 4, 5, 6, 7, 8], 1, 1, {"from": accounts[1]});
		await contract.initializeRole.sendTransaction(true, {"from": accounts[1]});
		await contract.mintEuroToken.sendTransaction(accounts[1], 100);

		await contract.receivedEnergy.sendTransaction({"from": accounts[1]});
		await truffleAssert.reverts(contract.receivedEnergy.sendTransaction());
	});

	it("test receiving energy and the redistribution of EuroTokens", async () => {
		await contract.registerHousehold.sendTransaction(accounts[1]);
		await contract.registerHousehold.sendTransaction(accounts[2]);
		
		await contract.initializeRole.sendTransaction(true, {"from": accounts[1]});
		await contract.initializeRole.sendTransaction(false, {"from": accounts[2]});
		
		let clearingResults = [1, 2, 1, 2, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
		await contract.storeClearingResults.sendTransaction(clearingResults, 1, 1, {"from": accounts[1]});
		await contract.storeClearingResults.sendTransaction(clearingResults, 1, 1, {"from": accounts[2]});

		await contract.mintEuroToken.sendTransaction(accounts[1], 100);

		await contract.receivedEnergy.sendTransaction({"from": accounts[1]});

		let currentPeriod = await contract.currentPeriod(function(err, res) { return res; });
		assert.equal(currentPeriod, 1);

		let tokenBalance = await contract.balanceOf.call(accounts[1]);
		assert.equal(tokenBalance.toNumber(), 98);

		tokenBalance = await contract.balanceOf.call(accounts[2]);
		assert.equal(tokenBalance.toNumber(), 2);

		let poolBalance = await contract.poolBalance(function(err, res) { return res; });
		assert.equal(poolBalance.toNumber(), 0);
	});
});