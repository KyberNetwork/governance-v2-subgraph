import { BigInt, Bytes } from '@graphprotocol/graph-ts';

export let ZERO_BI = BigInt.fromI32(0);
export let ONE_BI = BigInt.fromI32(1);
export let TWO_BI = BigInt.fromI32(2);

export function zeroAddress (): Bytes {
  return Bytes.fromHexString('0x0000000000000000000000000000000000000000') as Bytes;
}
