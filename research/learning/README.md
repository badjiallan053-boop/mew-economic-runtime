# Collected public learning evidence

Latest successful snapshot: `2026-10-07T13-13-06-688Z`, collected 7 October 2026 UTC. 159 observations; 15 successful source calls; zero unavailable sources or duplicate IDs. Attention window: 8 September–5 October 2026 UTC. No customer labels or verified merchant receipts.

Each run retains raw JSON, request manifests with SHA-256 checksums, normalized JSONL, quality results, a bounded advisory context and a pending human-label queue. The latest run also includes descriptive analysis and a deterministic nine-case baseline evaluation. These are public observations, not training-ready data.

The first run, `2026-10-07T13-11-23-563Z`, retains a genuine API-schema failure: selecting valid_contract returned HTTP 400 on both deployed Koios endpoints. The corrected run leaves that optional field unknown. The first run is a failure audit, not the recommended dataset.

Run the quality notebook from the repository root or this directory. See ../../docs/ML_LEARNING_PIPELINE.md for reproduction, rights review, leakage controls and model-evaluation requirements. Do not publish raw observations as customer payment proof or upload the pending label queue for training.
