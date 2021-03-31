import { Address, BigInt, log } from '@graphprotocol/graph-ts';
import { Delegated, Deposited, Withdraw } from '../../generated/KyberDaoV2/KyberStaking';
import { DepositEvent, WithdrawEvent, DelegateEvent, User, Transaction } from '../../generated/schema';
import { initOrGetGovernance, initStaker } from '../helpers/initializers';
import { ONE_BI } from '../utils/converters';

export function handleDeposit (event: Deposited): void {
  let governance = initOrGetGovernance(event.address);
  governance.totalStaked = governance.totalStaked.plus(event.params.amount);

  let staker = User.load(event.params.staker.toHexString());
  if (staker == null) {
    governance.totalStaker = governance.totalStaker.plus(ONE_BI);
    staker = initStaker(event.params.staker);
  }

  let txHash = event.transaction.hash.toHexString();
  let transaction = Transaction.load(txHash);
  if (transaction == null) {
    transaction = new Transaction(txHash);
    transaction.blockNumber = event.block.number;
    transaction.timestamp = event.block.timestamp;
    transaction.deposits = [];
    transaction.withdraws = [];
    transaction.delegates = [];
    transaction.votes = [];
  }

  let depositIndex = BigInt.fromI32(transaction.deposits.length);
  let deposit = new DepositEvent(txHash.concat('-').concat(depositIndex.toString()));
  deposit.amount = event.params.amount;
  deposit.staker = staker.id;
  deposit.timestamp = event.block.timestamp;
  deposit.epoch = event.params.curEpoch;
  deposit.txHash = txHash;
  deposit.save();

  transaction.deposits = transaction.deposits.concat([deposit.id]);
  transaction.save();

  //handle staker data
  staker.stake = staker.stake.plus(event.params.amount);
  if (staker.representative.toHexString() != staker.id) {
    let representative = User.load(staker.representative.toHexString());
    if (representative == null) {
      governance.totalStaker = governance.totalStaker.plus(ONE_BI);
      representative = initStaker(staker.representative as Address);
    }
    representative.delegatedStake = representative.delegatedStake.plus(event.params.amount);
    representative.save();
  }

  staker.save();
  governance.save();
}

export function handleWithdraw (event: Withdraw): void {
  let txHash = event.transaction.hash.toHexString();
  let governance = initOrGetGovernance(event.address);
  governance.totalStaked = governance.totalStaked.minus(event.params.amount);

  let staker = User.load(event.params.staker.toHexString());
  if (staker == null) {
    log.critical('handleWithdraw {}: user is not init {}', [txHash, event.params.staker.toHexString()]);
  }

  let transaction = Transaction.load(txHash);
  if (transaction == null) {
    transaction = new Transaction(txHash);
    transaction.blockNumber = event.block.number;
    transaction.timestamp = event.block.timestamp;
    transaction.deposits = [];
    transaction.withdraws = [];
    transaction.delegates = [];
    transaction.votes = [];
  }

  let withdrawIndex = BigInt.fromI32(transaction.withdraws.length);
  let withdraw = new WithdrawEvent(txHash.concat('-').concat(withdrawIndex.toString()));
  withdraw.amount = event.params.amount;
  withdraw.staker = staker.id;
  withdraw.timestamp = event.block.timestamp;
  withdraw.epoch = event.params.curEpoch;
  withdraw.txHash = txHash;
  withdraw.save();

  transaction.withdraws = transaction.withdraws.concat([withdraw.id]);
  transaction.save();

  //handle staker data
  staker.stake = staker.stake.minus(event.params.amount);
  if (staker.representative.toHexString() != staker.id) {
    let representative = User.load(staker.representative.toHexString());
    if (representative == null) {
      log.critical('handleWithdraw {}: representative is not init {}', [txHash, staker.representative.toHexString()]);
    }
    representative.delegatedStake = representative.delegatedStake.minus(event.params.amount);
    representative.save();
  }

  staker.save();
  governance.save();
}

export function handleDelegate (event: Delegated): void {
  let governance = initOrGetGovernance(event.address);

  let staker = User.load(event.params.staker.toHexString());
  if (staker == null) {
    governance.totalStaker = governance.totalStaker.plus(ONE_BI);
    staker = initStaker(event.params.staker);
  }

  let txHash = event.transaction.hash.toHexString();
  let transaction = Transaction.load(txHash);
  if (transaction == null) {
    transaction = new Transaction(txHash);
    transaction.blockNumber = event.block.number;
    transaction.timestamp = event.block.timestamp;
    transaction.deposits = [];
    transaction.withdraws = [];
    transaction.delegates = [];
    transaction.votes = [];
  }

  let delegateIndex = BigInt.fromI32(transaction.delegates.length);
  let delegate = new DelegateEvent(txHash.concat('-').concat(delegateIndex.toString()));
  delegate.representative = event.params.representative;
  delegate.staker = staker.id;
  delegate.timestamp = event.block.timestamp;
  delegate.epoch = event.params.epoch;
  delegate.txHash = txHash;
  delegate.save();

  transaction.delegates = transaction.delegates.concat([delegate.id]);
  transaction.save();

  //handle staker data
  if (event.params.isDelegated) {
    let representative = User.load(staker.representative.toHexString());
    if (representative == null) {
      governance.totalStaker = governance.totalStaker.plus(ONE_BI);
      representative = initStaker(staker.representative as Address);
    }
    staker.representative = event.params.representative;
    representative.delegatedStake = representative.delegatedStake.plus(staker.stake);
    representative.save();
  } else {
    let representative = User.load(staker.representative.toHexString());
    if (representative == null) {
      governance.totalStaker = governance.totalStaker.plus(ONE_BI);
      representative = initStaker(staker.representative as Address);
    }
    representative.delegatedStake = representative.delegatedStake.minus(staker.stake);
    representative.save();
  }

  staker.save();
  governance.save();
}
