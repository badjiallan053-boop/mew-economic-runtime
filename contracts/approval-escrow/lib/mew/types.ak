use cardano/address.{Address}

pub type EscrowDatum {
  version: Int,
  principal: Address,
  provider: Address,
  objective_digest: ByteArray,
  effect_digest: ByteArray,
  artifact_digest: ByteArray,
}

pub type EscrowAction {
  Accept { artifact_digest: ByteArray }
  Cancel
}
