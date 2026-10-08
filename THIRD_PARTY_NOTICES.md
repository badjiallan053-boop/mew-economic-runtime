# Third-party materials and license scope

The root [MIT License](LICENSE) covers MEW project-authored code and documentation contributed by its copyright holder. It does not replace a separate license attached to bundled material, nor grant rights the project does not own.

## Bundled materials

- **Instrument Sans and Instrument Serif fonts** in `public/assets/fonts/` are copyright their respective Instrument project authors and distributed under SIL Open Font License 1.1. The corresponding license texts are included beside the font files.
- **Vendored agent skills** under `.agents/skills/` retain the license and attribution in each skill's `LICENSE`, provenance file and source notice. Original MEW skills are project-authored; imported skills remain under their upstream terms.
- **npm packages** retain their own licenses. Versions and declared license identifiers are recorded in `package-lock.json`; check upstream license texts for the exact package version when redistributing a bundle.
- **Product artwork** `public/assets/mew-formation.png` and `public/assets/mew-social.png` has no separate rights statement in this repository. The root MIT grant does not cover those images until the owner and redistribution permission are documented.

Before publishing a new asset, dataset, model, benchmark response or customer artifact, record its source, owner, permission, license, permitted purpose and any attribution or retention conditions. Keep private customer data, credentials, wallet secrets, local model weights, runtime databases and raw pilot material outside the public repository.
