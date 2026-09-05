---
title: Python Execution Surfaces Before Your Code Runs
description: The interpreter, installer, test runner and import system can all execute code before your entry point does. What that means for supply-chain security and CI safety.
tags: [python, supply-chain, security, ci, hardening]
author: Sameer Alam
created: 2026-08-01
updated: 2026-09-06
status: published
---

# Python Execution Surfaces Before Your Code Runs

Python does not always begin executing code at `python app.py`. The interpreter, package installer, test runner, and import system can all execute code before an application reaches its own entry point.

This note summarizes common implicit execution surfaces that matter for supply-chain security, CI safety, and developer workstation hardening.

## Table of Contents

- [.pth files](#pth-files)
- [sitecustomize and usercustomize](#sitecustomize-and-usercustomize)
- [PYTHONSTARTUP](#pythonstartup)
- [PYTHONPATH and PYTHONHOME](#pythonpath-and-pythonhome)
- [setup.py](#setuppy)
- [pyproject.toml build backends](#pyprojecttoml-build-backends)
- [pytest conftest.py](#pytest-conftestpy)
- [package __init__.py files](#package-__init__py-files)
- [Non-.py import sources](#non-py-import-sources)
- [.pyc bytecode cache poisoning](#pyc-bytecode-cache-poisoning)
- [Zip imports](#zip-imports)
- [.egg files](#egg-files)
- [Defensive checklist](#defensive-checklist)

## Why This Matters

Python startup and tooling have several extension points designed for convenience: adding paths, customizing environments, compiling packages, loading tests, and importing packaged code. Those same extension points can be abused when an attacker controls dependencies, environment variables, build inputs, test files, or writable directories on `sys.path`.

A useful mental model:

- Runtime startup can execute code before your script.
- Install-time builds can execute code before a package is ever imported.
- Test discovery can execute code before a test function runs.
- Import resolution can execute code from places that do not look like ordinary `.py` files.

## .pth Files

`.pth` files are commonly used to add directories to Python's module search path. During normal `site` initialization, Python also executes any `.pth` line that begins with `import`.

```text
example.pth
import startup_hook
/some/extra/package/path
```

**Lives in:** site directories such as global or virtualenv `site-packages`.

**Runs when:** Python imports the `site` module during interpreter startup, unless startup is changed with flags such as `-S`.

**Risk:** A dependency, installer, or attacker with write access to `site-packages` can place a small `.pth` file that runs on every Python process using that environment. The file may look like harmless path configuration, so it is easy to miss during audits.

**Watch for:**

- `.pth` files containing executable `import` lines.
- legacy `easy-install.pth` entries.
- unexpected `.pth` files in virtualenvs, containers, and shared hosts.

## sitecustomize and usercustomize

After processing site paths, Python attempts to import `sitecustomize` and then `usercustomize` if they are importable.

`sitecustomize.py` is intended for environment-wide customization. `usercustomize.py` is intended for user-level customization when user site packages are enabled.

**Lives in:** any importable location on `sys.path`, often site-packages.

**Runs when:** Python performs standard `site` initialization.

**Risk:** A malicious or unexpected `sitecustomize.py` can run before application code in every interpreter launched from that environment. It has more room to hide logic than a one-line `.pth` entry because it is a full Python module.

**Watch for:**

- project directories accidentally placed before standard library paths.
- user-level site packages enabled in production or CI.
- unexpected startup modules in base images.

## PYTHONSTARTUP

`PYTHONSTARTUP` points to a Python file that is executed before an interactive Python prompt appears.

```bash
export PYTHONSTARTUP=/path/to/startup.py
python
```

**Lives in:** process environment.

**Runs when:** interactive Python starts. It does not run for normal script execution.

**Risk:** This is mostly a developer-targeting surface. If a shell profile, terminal configuration, or environment file sets `PYTHONSTARTUP`, code can run whenever a developer opens a Python REPL.

**Watch for:**

- suspicious exports in `.bashrc`, `.zshrc`, `.profile`, direnv files, and IDE launch settings.
- REPL startup scripts outside the user's expected dotfiles.

## PYTHONPATH and PYTHONHOME

`PYTHONPATH` adds directories to the module search path. If an attacker-controlled directory appears early in `sys.path`, imports may resolve to attacker-controlled modules instead of the intended package or standard library module.

`PYTHONHOME` changes where Python looks for its standard library and runtime support files. It is more disruptive, but in controlled environments it can redirect Python toward a modified runtime tree.

**Lives in:** process environment.

**Runs when:** import resolution begins, including early interpreter behavior.

**Risk:** Environment injection can cause module shadowing. A fake `json.py`, `logging.py`, `requests.py`, or package directory can run when application code imports what appears to be a trusted module.

**Watch for:**

- inherited CI variables.
- `.env` files loaded by application launchers.
- Docker images or shell wrappers setting broad Python paths.
- local files named after standard library modules.

## setup.py

`setup.py` is executable Python. When installing from a source distribution, build tools may run it during package build or metadata generation.

**Lives in:** source distributions and legacy Python packages.

**Runs when:** package installation or build steps execute.

**Risk:** Malicious packages can run arbitrary code during install, before the application imports them. This is one of the most common Python supply-chain execution paths because developers and CI systems routinely install dependencies with broad network and filesystem access.

**Watch for:**

- new dependencies that require source builds.
- packages without wheels for your platform.
- install scripts that perform network calls or shell commands.
- unexpected maintainer or release changes in package history.

## pyproject.toml Build Backends

Modern Python packages declare build behavior in `pyproject.toml`.

```toml
[build-system]
requires = ["setuptools", "wheel", "custom-build-helper"]
build-backend = "setuptools.build_meta"
```

This is cleaner than old packaging styles, but it does not remove execution. Build dependencies are installed into a build environment, and the selected backend runs Python hooks such as wheel or source distribution builders.

**Lives in:** the `[build-system]` table of `pyproject.toml`.

**Runs when:** installing or building a source package, especially under PEP 517 build isolation.

**Risk:** Execution can move from an obvious `setup.py` file into build requirements and backend hooks. The dangerous code may be in a build dependency rather than the package being reviewed.

**Watch for:**

- custom build backends.
- unfamiliar packages in `build-system.requires`.
- build dependencies not pinned or not covered by lockfiles.
- sdists pulled when wheels were expected.

## pytest conftest.py

pytest automatically imports `conftest.py` files during test discovery. These files define fixtures, hooks, and test configuration, but they are still Python modules.

**Lives in:** test directories and parent directories traversed by pytest.

**Runs when:** pytest starts collection and plugin discovery.

**Risk:** A pull request can add or modify `conftest.py` and cause code execution in CI before tests run. Reviewers may skim it as harmless test setup.

**Watch for:**

- shell commands, network calls, credential reads, or subprocess use in test configuration.
- broad autouse fixtures.
- pytest plugins loaded through configuration.
- test jobs with production secrets.

## Package __init__.py Files

Importing a package runs its `__init__.py`. That behavior is normal Python, but it becomes risky because imports are often transitive.

```python
import package_name
```

That single line may execute initialization code from several dependencies.

**Lives in:** package directories on `sys.path`.

**Runs when:** the package is imported directly or through another dependency.

**Risk:** A compromised dependency can execute during import, before the application calls any function from it. This is a common payload location because it reliably runs when the package is used.

**Watch for:**

- heavy side effects at import time.
- credential or environment reads during import.
- network calls in package initialization.
- newly added dependency imports in hot startup paths.

## Non-.py Import Sources

Python can import executable code from more than plain `.py` source files. Import hooks, compiled bytecode, zip archives, eggs, extension modules, and custom loaders can all participate in module loading.

**Lives in:** importable paths, archives, caches, binary extensions, and registered import hooks.

**Runs when:** the import system resolves and loads a module.

**Risk:** File-based reviews and scanners that only inspect `.py` files can miss code hidden in bytecode, archives, or loader behavior.

**Watch for:**

- unexpected archive files on `sys.path`.
- binary modules from untrusted sources.
- custom `sys.meta_path` or `sys.path_hooks` modifications.
- generated caches committed or preserved across builds.

## .pyc Bytecode Cache Poisoning

Python stores compiled bytecode in `__pycache__/` as `.pyc` files. On import, Python can use bytecode when its header metadata matches the source file state.

**Lives in:** `__pycache__/` directories beside source modules.

**Runs when:** the corresponding module is imported and Python accepts the cache.

**Risk:** If an attacker can alter `.pyc` files while leaving source unchanged, code review may show clean `.py` files while the interpreter executes poisoned bytecode. The practical risk depends on cache validation mode, file permissions, deployment process, and whether caches are copied between environments.

**Watch for:**

- writable source directories in shared systems.
- committed `__pycache__` directories.
- build artifacts reused without cleaning.
- unexpected `.pyc` files in deployment bundles.

## Zip Imports

Python includes `zipimport`, which allows modules to be imported directly from zip archives placed on `sys.path`. Executable zip applications can also be run directly with Python.

**Lives in:** `.zip`, `.pyz`, or other zip-format archives on `sys.path`.

**Runs when:** importing a module from the archive, or when invoking a runnable archive.

**Risk:** A zip archive can contain modules that shadow trusted names. Because archives are opaque in casual file listings, malicious modules can be easier to miss than ordinary source files.

**Watch for:**

- zip files added through `PYTHONPATH`, `.pth`, or launcher scripts.
- archives containing standard-library-like module names.
- vendored dependency bundles that are not unpacked for review.

## .egg Files

Eggs are older Python package archives used before wheels became the dominant distribution format. They can be placed on `sys.path`, often through legacy `easy_install` behavior.

**Lives in:** site-packages, commonly referenced by `easy-install.pth`.

**Runs when:** modules inside the egg are imported, or during legacy installation behavior.

**Risk:** Eggs use archive-based import behavior similar to zip imports. Legacy environments may keep them around for years, and old packaging workflows may not receive the same scrutiny as modern wheel-based installs.

**Watch for:**

- `.egg` entries in site-packages.
- `easy-install.pth`.
- old internal package repositories.
- pinned legacy setuptools versions.

## Defensive Checklist

- Prefer locked dependencies and reproducible builds.
- Prefer wheels from trusted indexes; treat source builds as code execution.
- Review `setup.py`, `pyproject.toml`, build requirements, and package release history before adding dependencies.
- Keep production and CI environments free of user site packages unless required.
- Inspect `.pth`, `sitecustomize.py`, `usercustomize.py`, `.egg`, `.zip`, `.pyz`, and `__pycache__` artifacts in runtime images.
- Avoid passing sensitive production credentials into dependency install or test jobs.
- Clean bytecode caches during build and deployment.
- Keep project roots clean of files that shadow standard library modules.
- Log or inspect `sys.path` in suspicious environments.
- Run untrusted tests and package builds in isolated sandboxes with minimal secrets and restricted network access.
