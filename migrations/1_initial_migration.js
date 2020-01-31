const Migrations = artifacts.require("Migrations");
const EnergyTrading = artifacts.require("EnergyTrading");

module.exports = function(deployer) {
  deployer.deploy(Migrations);
  deployer.deploy(EnergyTrading);
};
