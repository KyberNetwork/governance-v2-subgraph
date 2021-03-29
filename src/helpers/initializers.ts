import { Proposal, Vote } from '../../generated/schema';
import { log } from '@graphprotocol/graph-ts/index';

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
