pragma solidity >=0.4.22 <0.6.0;

contract EnergyTrading {
    uint256 constant UINT256_MAX = ~uint256(0);

    address public ttp;
    address[] households;     // the participating households.
    mapping(address => bool) _isRegistered;
    mapping(address => uint256) _householdIndices;
    uint256[] _clearingMinValues;
    uint256[] _clearingMaxValues;
    
    uint8 public totalPeriods = 4;   // the total number of periods in each horizon
    uint8 public currentPeriod = 0;  // the current period we are in
    bool public isClearing = true;   // whether we are clearing the market or trading
    uint256 public totalHouseholds = 0;
    uint8 public expectedTransfers = 0;  // how many energy transfers we expect in each horizon
    uint8 public transfersThisPeriod = 0;  // the number of transfers we had in this round
    int256 public poolBalance = 0;
    
    mapping (address => uint256) _euroTokenBalances;
    mapping (address => ClearingResult) _clearingResults;
    mapping (address => bool) _roles;   // true if the user is a buyer in this round
    mapping (address => bool) _roleSet; // whether the role has been set
    mapping (address => bool) _receivedEnergy;
    uint8 public clearingResultsReceived = 0;
    ClearingResult bestClearingResult;
    
    uint256 maxDelta = 100000000000;

    event ClearingResultsValid();
    event ClearingResultsInvalid(uint diff);
    event PoolPayment(address from, address to, uint amount);
    event PoolRedistribution();
    event HorizonOver();

    struct ClearingResult {
        uint256[] clearingResult;
        uint256 socialWelfare;
        uint256 netBalance;
    }

    constructor() public {
        ttp = msg.sender;
    }
    
    function registerHousehold(address household) public {
        require(msg.sender == ttp);

        households.push(household);
        _householdIndices[household] = totalHouseholds;
        _isRegistered[household] = true;
        totalHouseholds++;
    }

    function isRegisteredHousehold(address household) private view returns (bool) {
    	return _isRegistered[household];
    }

    function mintEuroToken(address mintTo, uint256 amount) public {
    	require(isRegisteredHousehold(mintTo));
        require(msg.sender == ttp);

        _euroTokenBalances[mintTo] += amount;
    }
    
    function balanceOf(address household) public view returns (uint256) {
    	require(isRegisteredHousehold(household));

        return _euroTokenBalances[household];
    }
    
    function initializeRole(bool role) public {
    	require(isRegisteredHousehold(msg.sender));
        require(!_roleSet[msg.sender]);

        _roles[msg.sender] = role;
        _roleSet[msg.sender] = true;
        
        if(role) {
            expectedTransfers++;
        }
    }
    
    function storeClearingResults(uint256[] memory results, uint256 sw, uint256 nb) public {
        require(isRegisteredHousehold(msg.sender));
        require(results.length == households.length * 2 * totalPeriods);
        require(_clearingResults[msg.sender].clearingResult.length == 0);
        require(isClearing);

        _clearingResults[msg.sender] = ClearingResult(results, sw, nb);

        // iterate over all results and compute the min/max value
        if(clearingResultsReceived == 0) {
            for(uint index = 0; index < results.length; index++) {
                _clearingMinValues.push(results[index]);
                _clearingMaxValues.push(results[index]);
            }
        }
        else {
            for(uint index = 0; index < results.length; index++) {
                if(results[index] < _clearingMinValues[index]) { _clearingMinValues[index] = results[index]; }
                if(results[index] > _clearingMaxValues[index]) { _clearingMaxValues[index] = results[index]; }
            }
        }

        clearingResultsReceived++;
        
        if(clearingResultsReceived == households.length) {
            uint maxDiff = getMaxClearingDiff();
            if(maxDiff <= maxDelta) {
                emit ClearingResultsValid();

                // move to the trading horizon
                selectBestClearingResult();
                isClearing = false;
                currentPeriod = 0;
            } else {
                // the clearing results are not valid
                emit ClearingResultsInvalid(maxDiff);
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
        delete bestClearingResult;
        delete _clearingMinValues;
        delete _clearingMaxValues;
    }
    
    function getMaxClearingDiff() private view returns (uint) {
        // get the highest difference between all entries of the clearing results.
        uint maxDiff = 0;
        for(uint index = 0; index < _clearingMinValues.length; index++) {
            uint diff = _clearingMaxValues[index] - _clearingMinValues[index];
            if(diff > maxDiff) { maxDiff = diff; }
        }

        return maxDiff;
    }

    function selectBestClearingResult() private {
        // select the best clearing result amongst all of them
        uint256 maxSW = 0;
        uint256 minNB = UINT256_MAX;
        for(uint householdIndex = 0; householdIndex < households.length; householdIndex++) {
            address householdAddress = households[householdIndex];
            uint256 householdSW = _clearingResults[householdAddress].socialWelfare;
            uint256 householdNB = _clearingResults[householdAddress].netBalance;
            if(householdSW > maxSW) { maxSW = householdSW; }
            if(householdNB < minNB) { minNB = householdNB; }
        }

        // compute the maximum weighted average
        uint256 maxWA = 0;
        address bestHouseholdAddress;
        for(uint householdIndex = 0; householdIndex < households.length; householdIndex++) {
            address householdAddress = households[householdIndex];
            uint256 householdSW = _clearingResults[householdAddress].socialWelfare;
            uint256 householdNB = _clearingResults[householdAddress].netBalance;
            uint256 householdWA = householdSW / maxSW + householdNB / minNB;
            if(householdWA >= maxWA) {
                maxWA = householdWA;
                bestHouseholdAddress = householdAddress;
            }
        }

        bestClearingResult = _clearingResults[bestHouseholdAddress];
    }
    
    function getTotalPrice(uint256 period, address householdAddress) public view returns (uint256) {
    	require(isRegisteredHousehold(householdAddress));
    	require(bestClearingResult.clearingResult.length > 0);
    	require(period < totalPeriods);

        uint256 householdIndex = _householdIndices[householdAddress];
        uint256 startIndex = period * households.length * 2;
        uint256 quantity = bestClearingResult.clearingResult[startIndex + householdIndex * 2];
        uint256 price = bestClearingResult.clearingResult[startIndex + householdIndex * 2 + 1];

        return quantity * price;
    }
    
    function receivedEnergy() public {
    	require(isRegisteredHousehold(msg.sender));
    	require(!isClearing);
        require(_roles[msg.sender]);  // make sure the sender is an energy buyer in the current round
        require(balanceOf(msg.sender) > 0);
        require(!_receivedEnergy[msg.sender]);

        uint256 price = getTotalPrice(currentPeriod, msg.sender);
        _euroTokenBalances[msg.sender] -= price;
        poolBalance += int(price);
        emit PoolPayment(msg.sender, address(0), price);
        transfersThisPeriod++;
        
        if(transfersThisPeriod == expectedTransfers) {
        	redistributePoolFunds();
            currentPeriod++;
            transfersThisPeriod = 0;
            
            if(currentPeriod == totalPeriods) {
                emit HorizonOver();
                isClearing = true;
                expectedTransfers = 0;
                clearingResultsReceived = 0;
                for(uint householdIndex = 0; householdIndex < households.length; householdIndex++) {
                    address householdAddress = households[householdIndex];
                    _roleSet[householdAddress] = false;
                }
                resetClearingResults();
            }
        }
    }
    
    function redistributePoolFunds() private {
        // redistribute pool funds over all sellers
        emit PoolRedistribution();
        for(uint householdIndex = 0; householdIndex < households.length; householdIndex++) {
            address householdAddress = households[householdIndex];
            if(!_roles[householdAddress]) {
                uint256 price = getTotalPrice(currentPeriod, householdAddress);
                _euroTokenBalances[householdAddress] += price;
                emit PoolPayment(address(0), householdAddress, price);
                poolBalance -= int(price);
            }
        }
    }
}
