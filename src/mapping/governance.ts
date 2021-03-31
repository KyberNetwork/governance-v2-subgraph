import { Bytes, BigInt } from '@graphprotocol/graph-ts/index';

import { Vote, Executor, Transaction, VoteEvent } from '../../generated/schema';
import {
  BinaryProposalCreated,
  GenericProposalCreated,
  VoteEmitted,
  ProposalQueued,
  ProposalExecuted,
  ProposalCanceled,
  ExecutorAuthorized,
  ExecutorUnauthorized,
  VotingPowerChanged,
} from '../../generated/KyberDaoV2/KyberGovernance';
import { YES_OPTION, NO_OPTION } from '../utils/constants';
import { getOrInitProposal, getProposal, getVote } from '../helpers/initializers';
import { ONE_BI, TWO_BI, ZERO_BI } from '../utils/converters';

export function handleBinaryProposalCreated (event: BinaryProposalCreated): void {
  let proposal = getOrInitProposal(event.params.proposalId.toString());

  proposal.type = 'Binary';
  proposal.maxVotingPower = event.params.maxVotingPower;
  proposal.options = [YES_OPTION, NO_OPTION];
  proposal.voteCounts = [new BigInt(0), new BigInt(0)];
  proposal.totalVotes = new BigInt(0);
  proposal.totalAddresses = new BigInt(0);
  proposal.creator = event.params.creator;
  proposal.votingPowerStrategy = event.params.strategy;
  proposal.executor = event.params.executor.toHexString();
  proposal.targets = event.params.targets as Bytes[];
  proposal.values = event.params.weiValues;
  proposal.signatures = event.params.signatures;
  proposal.calldatas = event.params.calldatas;
  proposal.withDelegatecalls = event.params.withDelegatecalls;
  proposal.startTime = event.params.startTime;
  proposal.endTime = event.params.endTime;
  proposal.state = 'Pending';
  proposal.link = event.params.link;
  proposal.lastUpdateBlock = event.block.number;
  proposal.lastUpdateTimestamp = event.block.timestamp;

  proposal.save();
}

export function handleGenericProposalCreated (event: GenericProposalCreated): void {
  let proposal = getOrInitProposal(event.params.proposalId.toString());

  proposal.type = 'Generic';
  proposal.maxVotingPower = event.params.maxVotingPower;
  proposal.options = event.params.options;
  proposal.voteCounts = [];
  for (let i = 0; i < proposal.options.length; i++) {
    proposal.voteCounts.push(new BigInt(0));
  }
  proposal.totalVotes = new BigInt(0);
  proposal.totalAddresses = new BigInt(0);
  proposal.creator = event.params.creator;
  proposal.votingPowerStrategy = event.params.strategy;
  proposal.executor = event.params.executor.toHexString();
  proposal.targets = [];
  proposal.values = [];
  proposal.signatures = [];
  proposal.calldatas = [];
  proposal.withDelegatecalls = [];
  proposal.startTime = event.params.startTime;
  proposal.endTime = event.params.endTime;
  proposal.state = 'Pending';
  proposal.link = event.params.link;
  proposal.lastUpdateBlock = event.block.number;
  proposal.lastUpdateTimestamp = event.block.timestamp;

  proposal.save();
}

export function handleProposalQueued (event: ProposalQueued): void {
  let proposal = getProposal(event.params.proposalId.toString(), 'handleProposalQueued');
  proposal.state = 'Queued';
  proposal.executionTime = event.params.executionTime;
  proposal.initiatorQueueing = event.params.initiatorQueueing;
  proposal.lastUpdateBlock = event.block.number;
  proposal.lastUpdateTimestamp = event.block.timestamp;
  proposal.save();
}

export function handleProposalExecuted (event: ProposalExecuted): void {
  let proposal = getProposal(event.params.proposalId.toString(), 'handleProposalExecuted');
  proposal.state = 'Executed';
  proposal.initiatorExecution = event.params.initiatorExecution;
  proposal.lastUpdateBlock = event.block.number;
  proposal.lastUpdateTimestamp = event.block.timestamp;
  proposal.save();
}

export function handleProposalCanceled (event: ProposalCanceled): void {
  let proposal = getProposal(event.params.proposalId.toString(), 'handleProposalCanceled');
  proposal.state = 'Canceled';
  proposal.lastUpdateBlock = event.block.number;
  proposal.lastUpdateTimestamp = event.block.timestamp;
  proposal.save();
}

export function handleVoteEmitted (event: VoteEmitted): void {
  let proposal = getProposal(event.params.proposalId.toString(), 'handleVoteEmitted');
  let id = event.params.proposalId.toString() + ' : ' + event.params.voter.toHexString();
  let vote = Vote.load(id);
  let preVoteOptions = ZERO_BI;
  if (vote == null) {
    vote = new Vote(id);
    proposal.totalVotes = proposal.totalVotes.plus(event.params.votingPower);
    proposal.totalAddresses = proposal.totalAddresses.plus(ONE_BI);
  } else {
    preVoteOptions = vote.voteOptions;
  }

  let newVoteCounts: BigInt[] = [];
  let oldVoteCounts = proposal.voteCounts!;
  // update proposal data
  for (let i = 0; i < proposal.options.length; i++) {
    let mask = TWO_BI.pow(i as u8);

    let hasVoted = preVoteOptions
      .div(mask)
      .mod(TWO_BI)
      .equals(ONE_BI);
    let isVoting = event.params.voteOptions
      .div(mask)
      .mod(TWO_BI)
      .equals(ONE_BI);

    if (hasVoted && !isVoting) {
      newVoteCounts.push(oldVoteCounts[i].minus(event.params.votingPower));
    } else if (!hasVoted && isVoting) {
      newVoteCounts.push(oldVoteCounts[i].plus(event.params.votingPower));
    }
  }
  proposal.voteCounts = newVoteCounts;
  proposal.state = 'Active';
  proposal.lastUpdateBlock = event.block.number;
  proposal.lastUpdateTimestamp = event.block.timestamp;
  proposal.save();

  vote.proposal = event.params.proposalId.toString();
  vote.voteOptions = event.params.voteOptions;
  vote.voter = event.params.voter;
  vote.votingPower = event.params.votingPower;
  vote.timestamp = event.block.timestamp.toI32();
  vote.save();

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

  let voteIndex = BigInt.fromI32(transaction.votes.length);
  let voteEvent = new VoteEvent(txHash.concat('-').concat(voteIndex.toString()));
  voteEvent.staker = event.params.voter.toHexString();
  voteEvent.timestamp = event.block.timestamp;
  voteEvent.proposal = proposal.id;
  voteEvent.voteOptions = event.params.voteOptions;
  voteEvent.txHash = txHash;
  voteEvent.save();

  transaction.votes = transaction.votes.concat([voteEvent.id]);
  transaction.save();
}

export function handleExecutorAuthorized (event: ExecutorAuthorized): void {
  let executor = Executor.load(event.params.executor.toHexString());
  if (executor) {
    executor.authorized = true;
  } else {
    executor = new Executor(event.params.executor.toHexString());
    executor.authorized = true;
    executor.authorizationBlock = event.block.number;
    executor.authorizationTimestamp = event.block.timestamp;
  }
  executor.save();
}

export function handleExecutorUnauthorized (event: ExecutorUnauthorized): void {
  let executor = Executor.load(event.params.executor.toHexString());
  if (executor) {
    executor.authorized = false;
    executor.save();
  }
}

export function handleVotingPowerChanged (event: VotingPowerChanged): void {
  let proposal = getProposal(event.params.proposalId.toString(), 'handleVotingPowerChanged');
  proposal.totalVotes = proposal.totalVotes.plus(event.params.newVotingPower).minus(event.params.oldVotingPower);
  let newVoteCounts: BigInt[] = [];
  let oldVoteCounts = proposal.voteCounts!;
  for (let i = 0; i < proposal.options.length; i++) {
    let mask = TWO_BI.pow(i as u8);
    if (
      event.params.voteOptions
        .div(mask)
        .mod(TWO_BI)
        .equals(ONE_BI)
    ) {
      newVoteCounts.push(oldVoteCounts[i].plus(event.params.newVotingPower).minus(event.params.oldVotingPower));
    }
    proposal.voteCounts = newVoteCounts;
  }
  proposal.save();

  let id = event.params.proposalId.toString() + ' : ' + event.params.voter.toHexString();
  let vote = getVote(id, 'handleVotingPowerChanged');
  vote.votingPower = event.params.newVotingPower;
  vote.save();
}
