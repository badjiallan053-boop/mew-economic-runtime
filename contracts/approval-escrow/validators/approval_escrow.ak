use aiken/collection/list
use aiken/primitive/bytearray
use cardano/address.{Address, Inline, Pointer, Script, VerificationKey}
use cardano/assets
use cardano/transaction.{InlineDatum, OutputReference, Transaction}
use mew/types.{Accept, Cancel, EscrowAction, EscrowDatum}

fn valid_key_address(address: Address) -> Bool {
  expect VerificationKey(key) = address.payment_credential
  bytearray.length(key) == 28 && when address.stake_credential is {
    None -> True
    Some(Inline(VerificationKey(stake))) -> bytearray.length(stake) == 28
    Some(Inline(Script(stake))) -> bytearray.length(stake) == 28
    Some(Pointer { slot_number, transaction_index, certificate_index }) ->
      slot_number >= 0 && transaction_index >= 0 && certificate_index >= 0
  }
}

validator approval_escrow {
  spend(
    datum: Option<EscrowDatum>,
    action: EscrowAction,
    own_ref: OutputReference,
    tx: Transaction,
  ) {
    expect Some(d) = datum
    // Resolve exactly this consumed cell, never a caller-selected look-alike.
    expect [own_input] = list.filter(
      tx.inputs,
      fn(i) { i.output_reference == own_ref },
    )
    expect Script(own_hash) = own_input.output.address.payment_credential
    expect InlineDatum(raw) = own_input.output.datum
    expect actual: EscrowDatum = raw
    expect actual == d
    expect d.version == 1
    expect valid_key_address(d.principal) && valid_key_address(d.provider)
    expect VerificationKey(principal_key) = d.principal.payment_credential
    expect VerificationKey(provider_key) = d.provider.payment_credential
    expect principal_key != provider_key
    expect bytearray.length(d.objective_digest) == 32
    expect bytearray.length(d.effect_digest) == 32
    expect bytearray.length(d.artifact_digest) == 32
    // Disallow batching with ANY second payment script, including other hashes
    // or the same payment hash under another staking credential.
    expect
      list.length(
        list.filter(
          tx.inputs,
          fn(i) {
            when i.output.address.payment_credential is {
              Script(_) -> True
              VerificationKey(_) -> False
            }
          },
        ),
      ) == 1
    expect tx.withdrawals == []
    expect assets.is_zero(tx.mint)
    expect
      list.all(
        tx.inputs,
        fn(i) { assets.is_zero(assets.without_lovelace(i.output.value)) },
      )
    expect
      list.all(
        tx.outputs,
        fn(o) { assets.is_zero(assets.without_lovelace(o.value)) },
      )
    expect
      !list.any(
        tx.outputs,
        fn(o) { o.address.payment_credential == Script(own_hash) },
      )
    let locked = assets.lovelace_of(own_input.output.value)
    expect locked > 0
    let recipient = when action is {
      Accept { artifact_digest } -> {
        expect bytearray.length(artifact_digest) == 32
        expect artifact_digest == d.artifact_digest
        expect list.has(tx.extra_signatories, principal_key)
        expect list.has(tx.extra_signatories, provider_key)
        d.provider
      }
      Cancel -> {
        expect list.has(tx.extra_signatories, principal_key)
        d.principal
      }
    }
    // Exactly one output to the FULL address; fee inputs fund fees/change.
    // Recipient-owned inputs would let returned change satisfy the payout.
    expect !list.any(tx.inputs, fn(i) { i.output.address == recipient })
    expect [payout] = list.filter(tx.outputs, fn(o) { o.address == recipient })
    assets.lovelace_of(payout.value) == locked
  }

  else(_) {
    fail
  }
}

// Full handler tests: each negative transaction toggles a single guard.
const principal_key =
  #"11111111111111111111111111111111111111111111111111111111"

const provider_key = #"22222222222222222222222222222222222222222222222222222222"

const other_key = #"33333333333333333333333333333333333333333333333333333333"

const stake_key = #"44444444444444444444444444444444444444444444444444444444"

const script_key = #"55555555555555555555555555555555555555555555555555555555"

const other_script_key =
  #"66666666666666666666666666666666666666666666666666666666"

const digest =
  #"7777777777777777777777777777777777777777777777777777777777777777"

const other_digest =
  #"8888888888888888888888888888888888888888888888888888888888888888"

fn principal() -> Address {
  Address {
    payment_credential: VerificationKey(principal_key),
    stake_credential: Some(Inline(VerificationKey(stake_key))),
  }
}

fn provider() -> Address {
  Address {
    payment_credential: VerificationKey(provider_key),
    stake_credential: Some(Inline(VerificationKey(stake_key))),
  }
}

fn escrow_address() -> Address {
  Address { payment_credential: Script(script_key), stake_credential: None }
}

fn fixture_datum() -> EscrowDatum {
  EscrowDatum {
    version: 1,
    principal: principal(),
    provider: provider(),
    objective_digest: digest,
    effect_digest: other_digest,
    artifact_digest: digest,
  }
}

fn fixture_ref() -> OutputReference {
  OutputReference { transaction_id: digest, output_index: 0 }
}

fn fixture_input(d: EscrowDatum) -> transaction.Input {
  let raw: Data = d
  transaction.Input {
    output_reference: fixture_ref(),
    output: transaction.Output {
      address: escrow_address(),
      value: assets.from_lovelace(5000000),
      datum: InlineDatum(raw),
      reference_script: None,
    },
  }
}

fn payout(address: Address, amount: Int) -> transaction.Output {
  transaction.Output {
    address,
    value: assets.from_lovelace(amount),
    datum: transaction.NoDatum,
    reference_script: None,
  }
}

fn fixture_tx(d: EscrowDatum, recipient: Address) -> Transaction {
  Transaction {
    ..transaction.placeholder,
    inputs: [
      fixture_input(d),
      transaction.Input {
        output_reference: OutputReference {
          transaction_id: digest,
          output_index: 1,
        },
        output: payout(
          Address {
            payment_credential: VerificationKey(other_key),
            stake_credential: None,
          },
          1000000,
        ),
      },
    ],
    outputs: [
      payout(recipient, 5000000),
      payout(
        Address {
          payment_credential: VerificationKey(other_key),
          stake_credential: None,
        },
        800000,
      ),
    ],
    fee: 200000,
    extra_signatories: [principal_key, provider_key],
  }
}

fn accept(tx: Transaction) -> Bool {
  approval_escrow.spend(
    Some(fixture_datum()),
    Accept { artifact_digest: digest },
    fixture_ref(),
    tx,
  )
}

fn cancel(tx: Transaction) -> Bool {
  approval_escrow.spend(Some(fixture_datum()), Cancel, fixture_ref(), tx)
}

fn replace_input(tx: Transaction, input: transaction.Input) -> Transaction {
  Transaction {
    ..tx,
    inputs: list.map(
      tx.inputs,
      fn(i) {
        if i.output_reference == fixture_ref() {
          input
        } else {
          i
        }
      },
    ),
  }
}

fn replace_payout(tx: Transaction, output: transaction.Output) -> Transaction {
  Transaction {
    ..tx,
    outputs: [
      output,
      payout(
        Address {
          payment_credential: VerificationKey(other_key),
          stake_credential: None,
        },
        800000,
      ),
    ],
  }
}

test accept_succeeds() {
  accept(fixture_tx(fixture_datum(), provider()))
}

test cancel_succeeds_without_provider_signature() {
  let tx = fixture_tx(fixture_datum(), principal())
  cancel(Transaction { ..tx, extra_signatories: [principal_key] })
}

test accept_without_principal_signature_fails() fail {
  let tx = fixture_tx(fixture_datum(), provider())
  accept(Transaction { ..tx, extra_signatories: [provider_key] })
}

test accept_without_provider_signature_fails() fail {
  let tx = fixture_tx(fixture_datum(), provider())
  accept(Transaction { ..tx, extra_signatories: [principal_key] })
}

test accept_with_attacker_signature_fails() fail {
  let tx = fixture_tx(fixture_datum(), provider())
  accept(Transaction { ..tx, extra_signatories: [principal_key, other_key] })
}

test cancel_without_principal_signature_fails() fail {
  let tx = fixture_tx(fixture_datum(), principal())
  cancel(Transaction { ..tx, extra_signatories: [provider_key] })
}

test wrong_artifact_fails() fail {
  approval_escrow.spend(
    Some(fixture_datum()),
    Accept { artifact_digest: other_digest },
    fixture_ref(),
    fixture_tx(fixture_datum(), provider()),
  )
}

test malformed_redeemer_artifact_fails() fail {
  approval_escrow.spend(
    Some(fixture_datum()),
    Accept { artifact_digest: #"01" },
    fixture_ref(),
    fixture_tx(fixture_datum(), provider()),
  )
}

test missing_handler_datum_fails() fail {
  approval_escrow.spend(
    None,
    Cancel,
    fixture_ref(),
    fixture_tx(fixture_datum(), principal()),
  )
}

test fabricated_handler_datum_fails() fail {
  let d = EscrowDatum { ..fixture_datum(), artifact_digest: other_digest }
  approval_escrow.spend(
    Some(d),
    Cancel,
    fixture_ref(),
    fixture_tx(fixture_datum(), principal()),
  )
}

test missing_actual_inline_datum_fails() fail {
  let i = fixture_input(fixture_datum())
  let tx = fixture_tx(fixture_datum(), provider())
  accept(
    replace_input(
      tx,
      transaction.Input {
        ..i,
        output: transaction.Output { ..i.output, datum: transaction.NoDatum },
      },
    ),
  )
}

test datum_hash_instead_of_inline_fails() fail {
  let i = fixture_input(fixture_datum())
  let tx = fixture_tx(fixture_datum(), provider())
  accept(
    replace_input(
      tx,
      transaction.Input {
        ..i,
        output: transaction.Output {
          ..i.output,
          datum: transaction.DatumHash(digest),
        },
      },
    ),
  )
}

test invalid_inline_datum_type_fails() fail {
  let i = fixture_input(fixture_datum())
  let tx = fixture_tx(fixture_datum(), provider())
  let raw: Data = 1
  accept(
    replace_input(
      tx,
      transaction.Input {
        ..i,
        output: transaction.Output { ..i.output, datum: InlineDatum(raw) },
      },
    ),
  )
}

test unknown_own_ref_fails() fail {
  let r = OutputReference { ..fixture_ref(), output_index: 99 }
  approval_escrow.spend(
    Some(fixture_datum()),
    Cancel,
    r,
    fixture_tx(fixture_datum(), principal()),
  )
}

test duplicate_own_ref_fails() fail {
  let tx = fixture_tx(fixture_datum(), provider())
  accept(
    Transaction { ..tx, inputs: [fixture_input(fixture_datum()), ..tx.inputs] },
  )
}

test key_input_cannot_impersonate_script_fails() fail {
  let i = fixture_input(fixture_datum())
  let tx = fixture_tx(fixture_datum(), provider())
  accept(
    replace_input(
      tx,
      transaction.Input {
        ..i,
        output: transaction.Output { ..i.output, address: principal() },
      },
    ),
  )
}

test wrong_version_fails() fail {
  let d = EscrowDatum { ..fixture_datum(), version: 2 }
  approval_escrow.spend(
    Some(d),
    Cancel,
    fixture_ref(),
    fixture_tx(d, principal()),
  )
}

test malformed_objective_digest_fails() fail {
  let d = EscrowDatum { ..fixture_datum(), objective_digest: #"01" }
  approval_escrow.spend(
    Some(d),
    Cancel,
    fixture_ref(),
    fixture_tx(d, principal()),
  )
}

test malformed_effect_digest_fails() fail {
  let d = EscrowDatum { ..fixture_datum(), effect_digest: #"01" }
  approval_escrow.spend(
    Some(d),
    Cancel,
    fixture_ref(),
    fixture_tx(d, principal()),
  )
}

test malformed_committed_artifact_fails() fail {
  let d = EscrowDatum { ..fixture_datum(), artifact_digest: #"01" }
  approval_escrow.spend(
    Some(d),
    Cancel,
    fixture_ref(),
    fixture_tx(d, principal()),
  )
}

test provider_cannot_be_script_fails() fail {
  let d = EscrowDatum { ..fixture_datum(), provider: escrow_address() }
  approval_escrow.spend(
    Some(d),
    Cancel,
    fixture_ref(),
    fixture_tx(d, principal()),
  )
}

test principal_cannot_be_script_fails() fail {
  let d = EscrowDatum { ..fixture_datum(), principal: escrow_address() }
  approval_escrow.spend(
    Some(d),
    Cancel,
    fixture_ref(),
    fixture_tx(d, principal()),
  )
}

test malformed_principal_payment_key_fails() fail {
  let d = EscrowDatum {
    ..fixture_datum(),
    principal: Address {
      ..principal(),
      payment_credential: VerificationKey(#"01"),
    },
  }
  approval_escrow.spend(
    Some(d),
    Cancel,
    fixture_ref(),
    fixture_tx(d, principal()),
  )
}

test malformed_provider_payment_key_fails() fail {
  let d = EscrowDatum {
    ..fixture_datum(),
    provider: Address {
      ..provider(),
      payment_credential: VerificationKey(#"01"),
    },
  }
  approval_escrow.spend(
    Some(d),
    Cancel,
    fixture_ref(),
    fixture_tx(d, principal()),
  )
}

test same_principal_provider_key_fails() fail {
  let d = EscrowDatum { ..fixture_datum(), provider: principal() }
  approval_escrow.spend(
    Some(d),
    Cancel,
    fixture_ref(),
    fixture_tx(d, principal()),
  )
}

test malformed_staking_key_fails() fail {
  let d = EscrowDatum {
    ..fixture_datum(),
    principal: Address {
      ..principal(),
      stake_credential: Some(Inline(VerificationKey(#"01"))),
    },
  }
  approval_escrow.spend(
    Some(d),
    Cancel,
    fixture_ref(),
    fixture_tx(d, principal()),
  )
}

test malformed_staking_script_fails() fail {
  let d = EscrowDatum {
    ..fixture_datum(),
    provider: Address {
      ..provider(),
      stake_credential: Some(Inline(Script(#"01"))),
    },
  }
  approval_escrow.spend(
    Some(d),
    Cancel,
    fixture_ref(),
    fixture_tx(d, principal()),
  )
}

test negative_stake_pointer_fails() fail {
  let d = EscrowDatum {
    ..fixture_datum(),
    provider: Address {
      ..provider(),
      stake_credential: Some(
        Pointer { slot_number: -1, transaction_index: 0, certificate_index: 0 },
      ),
    },
  }
  approval_escrow.spend(
    Some(d),
    Cancel,
    fixture_ref(),
    fixture_tx(d, principal()),
  )
}

test wrong_payout_recipient_fails() fail {
  accept(fixture_tx(fixture_datum(), principal()))
}

test provider_stake_substitution_fails() fail {
  let wrong = Address { ..provider(), stake_credential: None }
  accept(fixture_tx(fixture_datum(), wrong))
}

test principal_stake_substitution_fails() fail {
  let wrong = Address { ..principal(), stake_credential: None }
  cancel(fixture_tx(fixture_datum(), wrong))
}

test insufficient_payout_fails() {
  let tx = fixture_tx(fixture_datum(), provider())
  !accept(replace_payout(tx, payout(provider(), 4999999)))
}

test surplus_payout_fails() {
  let tx = fixture_tx(fixture_datum(), provider())
  !accept(replace_payout(tx, payout(provider(), 5000001)))
}

test split_payout_fails() fail {
  let tx = fixture_tx(fixture_datum(), provider())
  accept(
    Transaction {
      ..tx,
      outputs: [
        payout(provider(), 2500000),
        payout(provider(), 2500000),
        payout(
          Address {
            payment_credential: VerificationKey(other_key),
            stake_credential: None,
          },
          800000,
        ),
      ],
    },
  )
}

test second_script_input_different_hash_fails() fail {
  let tx = fixture_tx(fixture_datum(), provider())
  let i = fixture_input(fixture_datum())
  let second = transaction.Input {
    output_reference: OutputReference { ..fixture_ref(), output_index: 2 },
    output: transaction.Output {
      ..i.output,
      address: Address {
        payment_credential: Script(other_script_key),
        stake_credential: None,
      },
    },
  }
  accept(Transaction { ..tx, inputs: [second, ..tx.inputs] })
}

test second_script_input_different_stake_fails() fail {
  let tx = fixture_tx(fixture_datum(), provider())
  let i = fixture_input(fixture_datum())
  let second = transaction.Input {
    output_reference: OutputReference { ..fixture_ref(), output_index: 2 },
    output: transaction.Output {
      ..i.output,
      address: Address {
        ..escrow_address(),
        stake_credential: Some(Inline(VerificationKey(stake_key))),
      },
    },
  }
  accept(Transaction { ..tx, inputs: [second, ..tx.inputs] })
}

test escrow_native_asset_fails() fail {
  let tx = fixture_tx(fixture_datum(), provider())
  let i = fixture_input(fixture_datum())
  let value = assets.add(i.output.value, other_script_key, #"01", 1)
  accept(
    replace_input(
      tx,
      transaction.Input {
        ..i,
        output: transaction.Output { ..i.output, value },
      },
    ),
  )
}

test fee_input_native_asset_fails() fail {
  let tx = fixture_tx(fixture_datum(), provider())
  let extra = transaction.Input {
    output_reference: OutputReference { ..fixture_ref(), output_index: 3 },
    output: transaction.Output {
      ..payout(principal(), 2000000),
      value: assets.add(
        assets.from_lovelace(2000000),
        other_script_key,
        #"01",
        1,
      ),
    },
  }
  accept(Transaction { ..tx, inputs: [extra, ..tx.inputs] })
}

test output_native_asset_fails() fail {
  let tx = fixture_tx(fixture_datum(), provider())
  let o = payout(provider(), 5000000)
  accept(
    replace_payout(
      tx,
      transaction.Output {
        ..o,
        value: assets.add(o.value, other_script_key, #"01", 1),
      },
    ),
  )
}

test mint_fails() fail {
  let tx = fixture_tx(fixture_datum(), provider())
  accept(
    Transaction { ..tx, mint: assets.from_asset(other_script_key, #"01", 1) },
  )
}

test withdrawal_fails() fail {
  let tx = fixture_tx(fixture_datum(), provider())
  accept(
    Transaction { ..tx, withdrawals: [Pair(VerificationKey(stake_key), 1)] },
  )
}

test terminal_continuation_same_address_fails() fail {
  let tx = fixture_tx(fixture_datum(), provider())
  accept(
    Transaction {
      ..tx,
      outputs: [payout(escrow_address(), 1000000), ..tx.outputs],
    },
  )
}

test terminal_continuation_changed_stake_fails() fail {
  let tx = fixture_tx(fixture_datum(), provider())
  let address = Address {
    ..escrow_address(),
    stake_credential: Some(Inline(VerificationKey(stake_key))),
  }
  accept(
    Transaction { ..tx, outputs: [payout(address, 1000000), ..tx.outputs] },
  )
}

test zero_locked_value_fails() fail {
  let tx = fixture_tx(fixture_datum(), provider())
  let i = fixture_input(fixture_datum())
  accept(
    replace_input(
      tx,
      transaction.Input {
        ..i,
        output: transaction.Output {
          ..i.output,
          value: assets.from_lovelace(0),
        },
      },
    ),
  )
}

test no_staking_addresses_succeed() {
  let p = Address { ..principal(), stake_credential: None }
  let v = Address { ..provider(), stake_credential: None }
  let d = EscrowDatum { ..fixture_datum(), principal: p, provider: v }
  approval_escrow.spend(
    Some(d),
    Accept { artifact_digest: digest },
    fixture_ref(),
    fixture_tx(d, v),
  )
}

test script_staking_addresses_succeed() {
  let p = Address {
    ..principal(),
    stake_credential: Some(Inline(Script(stake_key))),
  }
  let v = Address {
    ..provider(),
    stake_credential: Some(Inline(Script(stake_key))),
  }
  let d = EscrowDatum { ..fixture_datum(), principal: p, provider: v }
  approval_escrow.spend(
    Some(d),
    Accept { artifact_digest: digest },
    fixture_ref(),
    fixture_tx(d, v),
  )
}

test pointer_staking_addresses_succeed() {
  let p = Address {
    ..principal(),
    stake_credential: Some(
      Pointer { slot_number: 0, transaction_index: 1, certificate_index: 0 },
    ),
  }
  let d = EscrowDatum { ..fixture_datum(), principal: p }
  approval_escrow.spend(Some(d), Cancel, fixture_ref(), fixture_tx(d, p))
}

test provider_input_cannot_satisfy_accept_payout_fails() fail {
  let tx = fixture_tx(fixture_datum(), provider())
  let recipient_input = transaction.Input {
    output_reference: OutputReference { ..fixture_ref(), output_index: 1 },
    output: payout(provider(), 1000000),
  }
  accept(
    Transaction {
      ..tx,
      inputs: [fixture_input(fixture_datum()), recipient_input],
    },
  )
}

test principal_input_cannot_satisfy_cancel_payout_fails() fail {
  let tx = fixture_tx(fixture_datum(), principal())
  let recipient_input = transaction.Input {
    output_reference: OutputReference { ..fixture_ref(), output_index: 1 },
    output: payout(principal(), 1000000),
  }
  cancel(
    Transaction {
      ..tx,
      inputs: [fixture_input(fixture_datum()), recipient_input],
    },
  )
}
