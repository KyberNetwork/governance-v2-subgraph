import { Governance, Proposal, User, Vote } from '../../generated/schema';
import { log, Address } from '@graphprotocol/graph-ts/index';
import { KYBER_VER3 } from '../utils/constants';
import { ZERO_BI } from '../utils/converters';
import { KyberStaking } from '../../generated/KyberDaoV2/KyberStaking';

export function getOrInitProposal (proposalId: string): Proposal {
  let proposal = Proposal.load(proposalId);
  if (!proposal) {
    proposal = new Proposal(proposalId);
  }
  return proposal!;
}

export function getProposal (proposalId: string, fn: string): Proposal {
  let proposal = Proposal.load(proposalId);
  if (proposal == null) {
    log.critical('{}: invalid proposal id {}', [fn, proposalId]);
  }
  return proposal!;
}

export function getVote (voteId: string, fn: string): Vote {
  let vote = Vote.load(voteId);
  if (vote == null) {
    log.critical('{}: invalid vote id {}', [fn, voteId]);
  }
  return vote!;
}

export function initOrGetGovernance (stakingAddress: Address): Governance {
  let governance = Governance.load(KYBER_VER3);
  if (governance == null) {
    governance = new Governance(KYBER_VER3);
    let stakingContract = KyberStaking.bind(stakingAddress);
    governance.epochPeriod = stakingContract.epochPeriodInSeconds();
    governance.startTime = stakingContract.firstEpochStartTime();
    governance.totalStaked = ZERO_BI;
    governance.totalStaker = ZERO_BI;
  }
  return governance!;
}

export function initStaker (stakerAddress: Address): User {
  let staker = new User(stakerAddress.toHexString());
  staker.representative = stakerAddress;
  staker.stake = ZERO_BI;
  staker.delegatedStake = ZERO_BI;

  return staker;
}
