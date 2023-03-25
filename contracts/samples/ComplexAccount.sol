// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.12;

/* solhint-disable avoid-low-level-calls */
/* solhint-disable no-inline-assembly */
/* solhint-disable reason-string */

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/proxy/utils/UUPSUpgradeable.sol";

import "../core/BaseAccount.sol";

/**
 * minimal account.
 *  this is sample minimal account.
 *  has execute, eth handling methods
 *  has a single signer that can send requests through the entryPoint.
 */
contract ComplexAccount is BaseAccount, UUPSUpgradeable, Initializable {
    using ECDSA for bytes32;

    //filler member, to push the nonce and owner to the same slot
    // the "Initializeble" class takes 2 bytes in the first slot
    bytes28 private _filler;

    //explicit sizes of nonce, to fit a single storage cell with "owner"
    uint96 private _nonce;
    address public owner;

    IEntryPoint private immutable _entryPoint;

    bool public isComplex;
    bytes32 public merkleRoot;

    event ComplexAccountInitialized(
        IEntryPoint indexed entryPoint,
        address indexed owner
    );

    modifier onlyOwner() {
        _onlyOwner();
        _;
    }

    /// @inheritdoc BaseAccount
    function nonce() public view virtual override returns (uint256) {
        return _nonce;
    }

    /// @inheritdoc BaseAccount
    function entryPoint() public view virtual override returns (IEntryPoint) {
        return _entryPoint;
    }

    // solhint-disable-next-line no-empty-blocks
    receive() external payable {}

    constructor(IEntryPoint anEntryPoint) {
        _entryPoint = anEntryPoint;
        _disableInitializers();
    }

    function _onlyOwner() internal view {
        //directly from EOA owner, or through the account itself (which gets redirected through execute())
        require(
            msg.sender == owner || msg.sender == address(this),
            "only owner"
        );
    }

    /**
     * execute a transaction (called directly from owner, or by entryPoint)
     */
    function execute(
        address dest,
        uint256 value,
        bytes calldata func
    ) external {
        _requireFromEntryPointOrOwner();
        _call(dest, value, func);
    }

    /**
     * execute a sequence of transactions
     */
    function executeBatch(
        address[] calldata dest,
        bytes[] calldata func
    ) external {
        _requireFromEntryPointOrOwner();
        require(dest.length == func.length, "wrong array lengths");
        for (uint256 i = 0; i < dest.length; i++) {
            _call(dest[i], 0, func[i]);
        }
    }

    /**
     * @dev The _entryPoint member is immutable, to reduce gas consumption.  To upgrade EntryPoint,
     * a new implementation of ComplexAccount must be deployed with the new EntryPoint address, then upgrading
     * the implementation by calling `upgradeTo()`
     */
    function initialize(
        address anOwner,
        bytes32 _merkleRoot
    ) public virtual initializer {
        _initialize(anOwner, _merkleRoot);
    }

    function _initialize(
        address anOwner,
        bytes32 _merkleRoot
    ) internal virtual {
        isComplex = true;
        owner = anOwner;
        merkleRoot = _merkleRoot;
        emit ComplexAccountInitialized(_entryPoint, owner);
    }

    // Require the function call went through EntryPoint or owner
    function _requireFromEntryPointOrOwner() internal view {
        require(
            msg.sender == address(entryPoint()) || msg.sender == owner,
            "account: not Owner or EntryPoint"
        );
    }

    /// implement template method of BaseAccount
    function _validateAndUpdateNonce(
        UserOperation calldata userOp
    ) internal override {
        require(_nonce++ == userOp.nonce, "account: invalid nonce");
    }

    function _validateSignature(
        UserOperation calldata userOp,
        bytes32 userOpHash
    ) internal virtual override returns (uint256 validationData) {
        bytes32 saltHash = bytes32(userOp.signature[:32]);
        uint256 nInterval = uint256(bytes32(userOp.signature[32:64]));
        uint256 totpCode = uint256(bytes32(userOp.signature[64:96]));
        uint16 proofLength = uint16(bytes2(userOp.signature[96:98]));
        bytes32[] memory proof = new bytes32[](proofLength);
        uint end;
        for (uint16 i = 0; i < proofLength; i++) {
            uint start = 98 + 32 * i;
            end = start + 32;
            proof[i] = bytes32(userOp.signature[start:end]);
        }
        bytes calldata sig = userOp.signature[end:];
        bytes32 sigHash = userOpHash.toEthSignedMessageHash();
        if (owner != sigHash.recover(sig)) return SIG_VALIDATION_FAILED;
        _validateTotp(proof, saltHash, nInterval, totpCode);
        return 0;
    }

    function _validateTotp(
        bytes32[] memory proof,
        bytes32 saltHash,
        uint256 nInterval,
        uint256 totpCode
    ) public view {
        bytes32 totpHash = keccak256(abi.encode(nInterval, totpCode));
        bytes32 leaf = keccak256(
            bytes.concat(keccak256(abi.encode(saltHash, totpHash)))
        );
        require(MerkleProof.verify(proof, merkleRoot, leaf), "Invalid proof");
    }

    function _call(address target, uint256 value, bytes memory data) internal {
        (bool success, bytes memory result) = target.call{value: value}(data);
        if (!success) {
            assembly {
                revert(add(result, 32), mload(result))
            }
        }
    }

    /**
     * check current account deposit in the entryPoint
     */
    function getDeposit() public view returns (uint256) {
        return entryPoint().balanceOf(address(this));
    }

    /**
     * deposit more funds for this account in the entryPoint
     */
    function addDeposit() public payable {
        entryPoint().depositTo{value: msg.value}(address(this));
    }

    /**
     * withdraw value from the account's deposit
     * @param withdrawAddress target to send to
     * @param amount to withdraw
     */
    function withdrawDepositTo(
        address payable withdrawAddress,
        uint256 amount
    ) public onlyOwner {
        entryPoint().withdrawTo(withdrawAddress, amount);
    }

    function _authorizeUpgrade(
        address newImplementation
    ) internal view override {
        (newImplementation);
        _onlyOwner();
    }
}
