# Third-party notices

Repository contributions that their contributors have the right to license are offered under the MIT License. Third-party packages and build tools remain under their own licenses.

The application uses, among others, Tauri, Wasmtime, Reqwest, Tokio, React, Three.js, React Three Fiber, and Rust crates. Exact resolved versions are recorded in `package-lock.json` and `src-tauri/Cargo.lock`; those lockfiles are the authoritative dependency inventory for a build.

Some development metadata or generated datasets can have attribution licenses, including browser compatibility data. Review the licenses for the resolved dependency graph before publishing binaries, preserve required notices, and regenerate a software bill of materials for each release.

Optional CUDA builds also depend on NVIDIA tooling and runtime components whose redistribution terms are separate from this repository's MIT License.
