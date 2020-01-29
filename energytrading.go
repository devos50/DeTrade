package main

import (
	"fmt"
	"github.com/hyperledger/fabric/core/chaincode/lib/cid"
	"github.com/hyperledger/fabric/core/chaincode/shim"
	"github.com/hyperledger/fabric/protos/peer"
	"strconv"
)

type EnergyMarketContract struct {
}

func compareBytes(a []byte, b []byte) bool {
	if (a == nil) != (b == nil) {
		return false;
	}

	if len(a) != len(b) {
		return false
	}

	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}

func (s EnergyMarketContract) Init(stub shim.ChaincodeStubInterface) peer.Response {
	serializedID, _ := cid.GetMSPID(stub)
	stub.PutState("ttp", []byte(serializedID))
	return shim.Success([]byte(serializedID))
}

func (s EnergyMarketContract) Invoke(stub shim.ChaincodeStubInterface) peer.Response {
	function, args := stub.GetFunctionAndParameters()
	fmt.Println("invoke is running " + function)

	if function == "registerHousehold" { // register a new household
		return s.registerHousehold(stub, args)
	} else if function == "mintEuroToken" {
		return s.mintEuroToken(stub, args)
	}

	fmt.Println("invoke did not find func: " + function) //error
	return shim.Error("Received unknown function invocation")
}

func (s *EnergyMarketContract) registerHousehold(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	admin, _ := stub.GetState("ttp")
	user, _ := cid.GetMSPID(stub)
	if !compareBytes(admin, []byte(user)) {
		return shim.Error("This method can only be invoked by the TTP")
	}

	// initialize the balance of the new user to 0
	stub.PutState(user, []byte(strconv.Itoa(0)))

	return shim.Success(nil)
}

func (s *EnergyMarketContract) mintEuroToken(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	admin, _ := stub.GetState("ttp")
	user, _ := cid.GetMSPID(stub)
	if !compareBytes(admin, []byte(user)) {
		return shim.Error("This method can only be invoked by the TTP")
	}

	_, args = stub.GetFunctionAndParameters()
	if len(args) != 1 {
		return shim.Error("Expecting a single argument, the number of EuroTokens to mint")
	}

	oldBalance, _ := stub.GetState(user)
	intOldBalance, _ := strconv.Atoi(string(oldBalance))
	toMint, _ := strconv.Atoi(args[0])
	newBalance := intOldBalance + toMint
	stub.PutState(user, []byte(strconv.Itoa(newBalance)))
	fmt.Println("Minting " + args[0] + " to user " + user)

	return shim.Success(nil)
}

func (s *EnergyMarketContract) getEuroTokenBalance(stub shim.ChaincodeStubInterface, args []string) peer.Response {
	_, args = stub.GetFunctionAndParameters()
	if len(args) != 1 {
		return shim.Error("Expecting a single argument, the MSPID of the user being queried")
	}

	value, err := stub.GetState(args[0])
	if err != nil {
		return shim.Error(fmt.Sprintf("Error when fetching EuroToken balance: %s", err.Error()))
	}
	if value == nil {
		return shim.Error("Error when fetching EuroToken balance: value is nil")
	}

	return shim.Success(value)
}

func main() {
	err := shim.Start(new(EnergyMarketContract))
	if err != nil {
		fmt.Printf("Error starting energy market chaincode: %s", err)
	}
}