pragma solidity >=0.4.22 <0.6.0;

contract EnergyTrading {
    address ttp;
    address[] households;     // the participating households.
    mapping(address => uint256) private _householdIndices;
    
    uint8 totalPeriods = 4;   // the total number of periods in each horizon
    uint8 currentPeriod = 0;  // the current period we are in
    bool isClearing = true;   // whether we are clearing the market or trading
    uint256 totalHouseholds = 0;
    uint8[] expectedTransfers = [0, 0, 0, 0];  // how many energy transfers we expect in each period
    uint8 transfersThisPeriod = 0;  // the number of transfers we had in this round
    
    mapping (address => uint256) private _euroTokenBalances;
    mapping (address => uint256[]) private _clearingResults;
    mapping (address => bool[]) private _roles;  // true if the user is a buyer in this round
    uint8 clearingResultsReceived = 0;
    uint256[] finalClearingResults;
    uint256 poolBalance = 0;
    
    uint256 maxDeltaQuantity = 0;
    uint256 maxDeltaPrice = 0;

    constructor() public {
        ttp = msg.sender;
    }
    
    function registerHousehold(address household) public {
        require(msg.sender == ttp);
        households.push(household);
        _householdIndices[msg.sender] = totalHouseholds;
        totalHouseholds += 1;
    }
    
    function mintEuroToken(address mintTo, uint256 amount) public {
        require(msg.sender == ttp);
        _euroTokenBalances[mintTo] += amount;
    }
    
    function balanceOf(address household) public view returns (uint256) {
        return _euroTokenBalances[household];
    }
    
    function initializeRoles(bool[] memory roles) public {
        require(roles.length == totalPeriods);
        _roles[msg.sender] = roles;
        
        for (uint i = 0; i < roles.length; i++) {
            if(roles[i]) {
                expectedTransfers[i]++;
            }
        }
    }
    
    function storeClearingResults(uint256[] memory results) public {
        require(_householdIndices[msg.sender] != 0);
        require(results.length == households.length * 2 * totalPeriods);
        require(isClearing);
        _clearingResults[msg.sender] = results;
        clearingResultsReceived++;
        
        if(clearingResultsReceived == households.length) {
            if(validateAllClearingResults()) {
                // move to the trading horizon
                isClearing = false;
                currentPeriod = 0;
            } else {
                // the clearing results are not valid
                clearingResultsReceived = 0;
                resetClearingResults();
            }
        }
    }
    
    function resetClearingResults() private {
        for(uint householdIndex = 0; householdIndex < households.length; householdIndex++) {
            address householdAddress = households[householdIndex];
            delete _clearingResults[householdAddress];
        }
    }
    
    function validateAllClearingResults() private returns (bool) {
        // validate all clearing results by iterating through the items in the result
        for(uint i = 0; i < households.length * 2 * totalPeriods; i++) {
            uint256 minValue = 100000000;
            uint256 maxValue = 0;
            for(uint householdIndex = 0; householdIndex < households.length; householdIndex++) {
                address householdAddress = households[householdIndex];
                uint256[] memory clearingResult = _clearingResults[householdAddress];
                uint256 value = clearingResult[i];
                if(value < minValue) { minValue = value; }
                if(value > maxValue) { maxValue = value; }
            }
            
            if(i % 2 == 0 && maxValue - minValue > maxDeltaQuantity) { // quantity
                return false;
            }
            if(i % 2 == 0 && maxValue - minValue > maxDeltaPrice) { // price
                return false;
            }
        }
        
        return true;
    }
    
    function getTotalPrice(uint256 period, address householdAddress) public view returns (uint256) {
        uint256 householdIndex = _householdIndices[householdAddress];
        uint256 startIndex = period * households.length * 2;
        uint256 quantity = startIndex + householdIndex * 2;
        uint256 price = startIndex + householdIndex * 2 + 1;
        return quantity * price;
    }
    
    function receivedEnergy() public {
        require(_roles[msg.sender][currentPeriod]);  // make sure the sender is an energy buyer in the current round
        uint256 price = getTotalPrice(currentPeriod, msg.sender);
        _euroTokenBalances[msg.sender] -= price;
        poolBalance += price;
        transfersThisPeriod++;
        
        if(transfersThisPeriod == expectedTransfers[currentPeriod]) {
            redistributePoolFunds();
            currentPeriod++;
            if(currentPeriod == totalPeriods) {
                isClearing = true;
                expectedTransfers = [0, 0, 0, 0];
                transfersThisPeriod = 0;
                clearingResultsReceived = 0;
                resetClearingResults();
            }
        }
    }
    
    function redistributePoolFunds() private {
        // redistribute pool funds over all sellers
        for(uint householdIndex = 0; householdIndex < households.length; householdIndex++) {
            address householdAddress = households[householdIndex];
            if(!_roles[householdAddress][currentPeriod]) {
                uint256 price = getTotalPrice(currentPeriod, householdAddress);
                _euroTokenBalances[msg.sender] -= price;
                poolBalance += price;
            }
        }
    }
}
