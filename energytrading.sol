pragma solidity >=0.4.22 <0.6.0;

contract EnergyTrading {
    address ttp;
    address[] households;
    
    uint8 totalPeriods = 4;   // the total number of periods in each horizon
    uint8 currentPeriod = 1;  // the current period we are in
    bool isClearing = true;   // whether we are clearing the market or trading
    
    mapping (address => uint256) private _euroTokenBalances;
    mapping (address => uint256[]) private _clearingResults;
    mapping (address => bool[]) private _roles;
    uint8 clearingResultsReceived = 0;

    constructor() public {
        ttp = msg.sender;
    }
    
    function registerHousehold(address household) public {
        require(msg.sender == ttp);
        households.push(household);
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
    }
    
    function storeClearingResults(uint256[] memory results) public {
        // TODO for now we assume that the results are valid
        // TODO for now we assume that the caller is actually an household
        require(results.length == households.length * 2 * totalPeriods);
        require(isClearing);
        _clearingResults[msg.sender] = results;
        clearingResultsReceived++;
        
        if(clearingResultsReceived == households.length) {
            // TODO validate whether all received results are valid
            
            // move to the trading horizon
            isClearing = false;
            currentPeriod = 1;
        }
    }
    
    function receivedEnergy() public {
        
    }
}

